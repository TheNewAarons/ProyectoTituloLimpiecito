/**
 * RF-BI-05 (SCRUM-22) — Reservas desde la web, emulando la app móvil (que no está operativa) para que el módulo
 * de demanda tenga datos. Solo agrega: no modifica la app (routes/rutas_app/Reserva.js) ni sus tablas.
 * - Misma regla de cupo que la app: cuentan las reservas APROBADAS (2) y EN PROCESO (3) de la categoría en ese día
 *   y bloque, contra `horarios.cant_servicios`.
 * - La reserva queda EN PROCESO (3) para que el Admin la apruebe en App servicio > Reservas; sin pago real:
 *   metodo_pago 'SIMULADO', pagado false (la app cobraba con Webpay).
 * - `fecha_reserva` se guarda como día + hora de inicio del bloque (igual que los datos existentes).
 */
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const Sequelize = require('sequelize');
const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const Reserva = require('../../modelos/sist_app/Reserva');
const UsuarioApp = require('../../modelos/sist_app/Usuario_app');
const Extra = require('../../modelos/sist_app/Extra');
const ExtraLavado = require('../../modelos/sist_app/Extra_lavado');
const { crearTransporte, smtpConfigurado } = require('../correo/transporte');

const ESTADO = { FINALIZADO: 1, APROBADO: 2, EN_PROCESO: 3, RECHAZADO: 4 };
const ESTADOS_OCUPAN_CUPO = [ESTADO.APROBADO, ESTADO.EN_PROCESO];
const ACTIVO = 1;
const DIAS_MAXIMOS = 60; // se reserva desde mañana hasta 60 días
const CANTIDAD_MAXIMA = 10;
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const RE_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Mismo destinatario que la app al crear una reserva; configurable para no escribirle a la empresa desde pruebas.
const DESTINO_EMPRESA = () => process.env.CORREO_RESERVAS || 'app.movil@aseolimpiecito.cl';

const sinTilde = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const consultar = (sql, replacements, t) => db.sequelize.query(sql, { replacements: replacements, type: Sequelize.QueryTypes.SELECT, transaction: t });

/** 'YYYY-MM-DD' -> nombre del día sin tilde ('miercoles'). */
function diaSemana(ymd) {
  const p = ymd.split('-').map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
}

function sumarDias(ymd, n) {
  const p = ymd.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
}

function idPositivo(v, campo) {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || !Number.isSafeInteger(n) || n <= 0) {
    throw new AppError('CAMPO_INVALIDO', campo + ' debe ser un entero mayor a 0', 400, { campo: campo });
  }
  return n;
}

/** Fecha reservable: formato válido, desde mañana y hasta DIAS_MAXIMOS. */
function validarFecha(v, hoy) {
  const h = hoy || fecha.hoySantiago();
  if (typeof v !== 'string' || !RE_FECHA.test(v) || isNaN(new Date(v + 'T00:00:00Z').getTime()) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v) {
    throw new AppError('CAMPO_INVALIDO', 'fecha debe ser YYYY-MM-DD', 400, { campo: 'fecha' });
  }
  if (v <= h) throw new AppError('FECHA_NO_RESERVABLE', 'Solo se puede reservar desde mañana.', 400, { fecha: v });
  if (v > sumarDias(h, DIAS_MAXIMOS)) throw new AppError('FECHA_NO_RESERVABLE', 'Solo se puede reservar hasta ' + DIAS_MAXIMOS + ' días hacia adelante.', 400, { fecha: v });
  return v;
}

/** Catálogo para reservar: categorías activas con sus servicios activos (sin rutas de archivos internas). */
async function catalogo() {
  const filas = await consultar(
    'SELECT c.id categoria_id, c.nombre categoria, c.activar_cantidad, s.id, s.nombre, s.descripcion, s.precio ' +
    'FROM categoria_servicios c JOIN servicios s ON s.categoriaServicioId = c.id ' +
    'WHERE c.estado = :activo AND s.estado = :activo ORDER BY c.id, s.nombre', { activo: ACTIVO });
  const porCategoria = new Map();
  filas.forEach((f) => {
    if (!porCategoria.has(f.categoria_id)) {
      porCategoria.set(f.categoria_id, {
        id: Number(f.categoria_id),
        nombre: f.categoria,
        pide_cantidad: !!Number(f.activar_cantidad),
        // La app guarda datos del vehículo (extra_lavados) en la categoría de lavado.
        pide_vehiculo: /veh[ií]cul|lavado/i.test(f.categoria),
        servicios: []
      });
    }
    porCategoria.get(f.categoria_id).servicios.push({
      id: Number(f.id), nombre: f.nombre, descripcion: f.descripcion, precio: f.precio === null ? null : Number(f.precio)
    });
  });
  return Array.from(porCategoria.values());
}

/** Bloques activos de la categoría para el día de la semana de `ymd`, con su horario y cupo. */
async function bloquesDelDia(categoriaId, ymd, t) {
  const filas = await consultar(
    "SELECT b.id, TIME_FORMAT(b.hora_inicio, '%H:%i') inicio, TIME_FORMAT(b.hora_fin, '%H:%i') fin, d.nombre dia, " +
    'h.id horario_id, h.cant_servicios FROM horarios h JOIN dias d ON d.horarioId = h.id JOIN bloques b ON b.diaId = d.id ' +
    'WHERE h.categoriaServicioId = :categoria AND h.estado = :activo AND d.estado = :activo AND b.activo = 1 ' +
    'ORDER BY b.hora_inicio', { categoria: categoriaId, activo: ACTIVO }, t);
  const dia = diaSemana(ymd);
  return filas.filter((f) => sinTilde(f.dia) === dia);
}

/** Reservas que ocupan cupo por hora de inicio ('09:00' -> n) para la categoría y el día. */
async function ocupados(categoriaId, ymd, t) {
  const filas = await consultar(
    "SELECT TIME_FORMAT(r.hora_inicio, '%H:%i') inicio, COUNT(*) n FROM reservas r JOIN servicios s ON s.id = r.servicioId " +
    "WHERE s.categoriaServicioId = :categoria AND DATE_FORMAT(r.fecha_reserva, '%Y-%m-%d') = :dia AND r.estado IN (:estados) " +
    'GROUP BY inicio', { categoria: categoriaId, dia: ymd, estados: ESTADOS_OCUPAN_CUPO }, t);
  const r = {};
  filas.forEach((f) => { r[f.inicio] = Number(f.n); });
  return r;
}

/** GET disponibilidad?categoria_id=&fecha= — bloques del día con cupos libres. */
async function disponibilidad(q, hoy) {
  const categoriaId = idPositivo(q.categoria_id, 'categoria_id');
  const dia = validarFecha(q.fecha, hoy);
  const bloques = await bloquesDelDia(categoriaId, dia);
  const usados = await ocupados(categoriaId, dia);
  return {
    fecha: dia,
    dia: diaSemana(dia),
    bloques: bloques.map((b) => {
      const libres = Math.max(Number(b.cant_servicios) - (usados[b.inicio] || 0), 0);
      return { id: Number(b.id), inicio: b.inicio, fin: b.fin, cupos: Number(b.cant_servicios), libres: libres };
    })
  };
}

function texto(v, campo, max, obligatorio, errores) {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    if (obligatorio) errores[campo] = 'obligatorio';
    return null;
  }
  if (typeof v !== 'string') { errores[campo] = 'debe ser texto'; return null; }
  const s = v.trim();
  if (s.length > max) errores[campo] = 'maximo ' + max + ' caracteres';
  return s;
}

/** Valida el cuerpo de POST /reservas (formato; las reglas de negocio se revisan en la transacción). */
function normalizar(body, hoy) {
  const b = body || {};
  const c = b.cliente || {};
  const errores = {};
  const r = {
    servicio_id: idPositivo(b.servicio_id, 'servicio_id'),
    bloque_id: idPositivo(b.bloque_id, 'bloque_id'),
    fecha: validarFecha(b.fecha, hoy),
    cantidad: 1,
    cliente: {
      nombre: texto(c.nombre, 'nombre', 100, true, errores),
      correo: texto(c.correo, 'correo', 150, true, errores),
      celular: texto(c.celular, 'celular', 20, true, errores),
      direccion: texto(c.direccion, 'direccion', 200, true, errores),
      recibe: texto(c.recibe, 'recibe', 100, false, errores)
    },
    vehiculo: null
  };
  // Nombres solo con letras (con tildes), espacios, apóstrofo y guion; la dirección lleva números pero debe tener letras.
  const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
  ['nombre', 'recibe'].forEach((k) => {
    if (r.cliente[k] && !errores[k] && (!RE_NOMBRE.test(r.cliente[k]) || r.cliente[k].replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').length < 2)) errores[k] = 'solo letras';
  });
  if (r.cliente.direccion && !errores.direccion && (r.cliente.direccion.length < 5 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2}/.test(r.cliente.direccion))) errores.direccion = 'debe incluir calle (letras) y numero';
  if (r.cliente.correo && !errores.correo && !RE_EMAIL.test(r.cliente.correo)) errores.correo = 'correo invalido';
  if (r.cliente.celular && !errores.celular && !/^\+?\d{8,15}$/.test(r.cliente.celular.replace(/[\s-]/g, ''))) errores.celular = 'celular invalido';
  if (b.cantidad !== undefined && b.cantidad !== null && b.cantidad !== '') {
    const n = Number(b.cantidad);
    if (!Number.isInteger(n) || n < 1 || n > CANTIDAD_MAXIMA) errores.cantidad = 'entre 1 y ' + CANTIDAD_MAXIMA;
    else r.cantidad = n;
  }
  if (b.vehiculo) {
    const v = b.vehiculo;
    r.vehiculo = {
      tipo: texto(v.tipo, 'vehiculo.tipo', 50, true, errores),
      marca: texto(v.marca, 'vehiculo.marca', 50, true, errores),
      modelo: texto(v.modelo, 'vehiculo.modelo', 50, true, errores),
      patente: texto(v.patente, 'vehiculo.patente', 10, true, errores)
    };
    // Patente chilena de auto: 6 caracteres, formato actual BBBB12 (4 letras + 2 números) o antiguo AB1234.
    // Se aceptan guiones, puntos o espacios al escribir y se guarda sin ellos, en mayúsculas.
    if (r.vehiculo.patente) {
      const p = r.vehiculo.patente.replace(/[\s.·-]/g, '').toUpperCase();
      if (!/^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(p)) errores['vehiculo.patente'] = 'patente invalida (ej. BCDF12 o AB1234)';
      else r.vehiculo.patente = p;
    }
  }
  if (Object.keys(errores).length) throw new AppError('CAMPO_INVALIDO', 'revise los campos del formulario', 400, errores);
  return r;
}

/**
 * POST /reservas — crea la reserva EN PROCESO en una transacción. Bloquea el horario de la categoría (FOR UPDATE)
 * para que dos personas no tomen el último cupo del mismo bloque.
 */
async function crear(body, opciones) {
  const o = opciones || {};
  const d = normalizar(body, o.hoy);
  const resultado = await db.sequelize.transaction(async (t) => {
    const servicio = (await consultar(
      'SELECT s.id, s.nombre, s.precio, s.estado, s.categoriaServicioId categoria_id, c.estado categoria_estado, c.activar_cantidad, c.nombre categoria ' +
      'FROM servicios s JOIN categoria_servicios c ON c.id = s.categoriaServicioId WHERE s.id = :id', { id: d.servicio_id }, t))[0];
    if (!servicio || Number(servicio.estado) !== ACTIVO || Number(servicio.categoria_estado) !== ACTIVO) {
      throw new AppError('SERVICIO_NO_DISPONIBLE', 'El servicio no está disponible.', 409, { servicio_id: d.servicio_id });
    }
    const pideVehiculo = /veh[ií]cul|lavado/i.test(servicio.categoria);
    if (pideVehiculo && !d.vehiculo) throw new AppError('CAMPO_INVALIDO', 'revise los campos del formulario', 400, { vehiculo: 'obligatorio para este servicio' });
    if (!Number(servicio.activar_cantidad)) d.cantidad = 1;

    const bloques = await bloquesDelDia(servicio.categoria_id, d.fecha, t);
    const bloque = bloques.find((b) => Number(b.id) === d.bloque_id);
    if (!bloque) throw new AppError('BLOQUE_NO_DISPONIBLE', 'El horario elegido no está disponible ese día.', 409, { bloque_id: d.bloque_id });
    await consultar('SELECT id FROM horarios WHERE id = :id FOR UPDATE', { id: bloque.horario_id }, t);
    const usados = await ocupados(servicio.categoria_id, d.fecha, t);
    if ((usados[bloque.inicio] || 0) >= Number(bloque.cant_servicios)) {
      throw new AppError('SIN_CUPO', 'Ya no quedan cupos en ese horario. Elija otro.', 409, { bloque_id: d.bloque_id });
    }

    let cliente = await UsuarioApp.findOne({ where: { correo: d.cliente.correo }, transaction: t });
    if (!cliente) {
      cliente = await UsuarioApp.create({
        nombre: d.cliente.nombre, correo: d.cliente.correo, celular: d.cliente.celular, direccion: d.cliente.direccion, estado: ACTIVO
      }, { transaction: t });
    }
    const maxOrden = await Reserva.max('orden', { transaction: t });
    const precio = servicio.precio === null ? 0 : Number(servicio.precio);
    const reserva = await Reserva.create({
      orden: (Number(maxOrden) || 0) + 1,
      fecha_creacion: new Date(),
      hora_inicio: bloque.inicio + ':00',
      hora_fin: bloque.fin + ':00',
      fecha_reserva: new Date(d.fecha + 'T' + bloque.inicio + ':00Z'),
      precio: precio,
      estado: ESTADO.EN_PROCESO,
      tipo: d.vehiculo ? 2 : 1, // igual que la app: 2 = lavado (con datos del vehículo)
      metodo_pago: 'SIMULADO',
      pagado: false,
      cantidad: d.cantidad,
      precio_total: precio * d.cantidad,
      usuarioAppId: cliente.id,
      servicioId: servicio.id
    }, { transaction: t });
    const extra = { direccion: d.cliente.direccion, celular: d.cliente.celular, recibe: d.cliente.recibe || d.cliente.nombre, reservaId: reserva.id };
    if (d.vehiculo) await ExtraLavado.create(Object.assign({}, extra, d.vehiculo), { transaction: t });
    else await Extra.create(extra, { transaction: t });
    return { reserva: reserva, servicio: servicio, bloque: bloque };
  });

  const r = resultado.reserva;
  const resumen = {
    id: r.id, orden: r.orden, servicio: resultado.servicio.nombre, fecha: d.fecha,
    bloque: resultado.bloque.inicio + ' - ' + resultado.bloque.fin, cantidad: d.cantidad, precio_total: r.precio_total,
    estado: 'EN_PROCESO'
  };
  await avisar(resumen, d, o.transporte); // el correo no revierte la reserva
  return resumen;
}

const PLANTILLA_PATH = path.join(__dirname, '..', '..', 'views', 'reservas', 'reserva.hbs');
// Mismo logo que los correos de órdenes de compra y de códigos, embebido como adjunto inline (cid).
const LOGO_PATH = path.join(__dirname, '..', '..', 'views', 'ordenes-compra', 'logo-limpiecito.png');
const PLANTILLA_CLIENTE_PATH = path.join(__dirname, '..', '..', 'views', 'reservas', 'reserva-cliente.hbs');
const plantillas = {};
// Handlebars escapa por defecto: los datos del cliente no pueden inyectar HTML.
const render = (datos) => {
  const ruta = datos.paraCliente ? PLANTILLA_CLIENTE_PATH : PLANTILLA_PATH;
  if (!plantillas[ruta]) plantillas[ruta] = handlebars.compile(fs.readFileSync(ruta, 'utf8'));
  return plantillas[ruta](datos);
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_TEXTO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
/** '2026-12-01' -> 'martes 1 de diciembre de 2026' */
function fechaLarga(ymd) {
  const p = ymd.split('-').map(Number);
  return DIAS_TEXTO[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + ' ' + p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0];
}

/** Aviso a la empresa y confirmación al cliente (mismo diseño que el correo de códigos); si el correo falla la reserva sigue creada. */
async function avisar(r, d, transporte) {
  if (!transporte && !smtpConfigurado()) return;
  const tx = transporte || crearTransporte();
  const base = {
    orden: r.orden, servicio: r.servicio, fechaTexto: fechaLarga(r.fecha), bloque: r.bloque,
    cantidad: r.cantidad > 1 ? r.cantidad : null, total: '$' + Number(r.precio_total).toLocaleString('es-CL'),
    recibida: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }),
    nombre: d.cliente.nombre, correo: d.cliente.correo, celular: d.cliente.celular, direccion: d.cliente.direccion,
    recibe: d.cliente.recibe || d.cliente.nombre,
    vehiculo: d.vehiculo ? d.vehiculo.tipo + ' ' + d.vehiculo.marca + ' ' + d.vehiculo.modelo + ' · ' + d.vehiculo.patente : null
  };
  const adjuntos = fs.existsSync(LOGO_PATH) ? [{ filename: 'logo-limpiecito.png', path: LOGO_PATH, cid: 'logo-limpiecito' }] : [];
  const correos = [
    {
      from: '"Reservas Limpiecito" <no-reply@aseolimpiecito.cl>', to: DESTINO_EMPRESA(),
      subject: 'Nueva reserva desde la web (N° ' + r.orden + ')',
      text: 'Nueva reserva N° ' + r.orden + ': ' + r.servicio + ', ' + base.fechaTexto + ', ' + r.bloque + ' hrs. Cliente: ' + d.cliente.nombre + ' (' + d.cliente.correo + ').',
      html: render(Object.assign({ titulo: 'Nueva reserva desde la web', paraCliente: false }, base)),
      attachments: adjuntos
    },
    {
      from: '"Aseo Limpiecito" <no-reply@aseolimpiecito.cl>', to: d.cliente.correo,
      subject: 'Recibimos tu reserva N° ' + r.orden,
      text: 'Hola ' + d.cliente.nombre + ', recibimos tu reserva N° ' + r.orden + ': ' + r.servicio + ', ' + base.fechaTexto + ', ' + r.bloque + ' hrs. Te avisaremos cuando quede confirmada.',
      html: render(Object.assign({ titulo: 'Recibimos tu reserva', paraCliente: true }, base)),
      attachments: adjuntos
    }
  ];
  for (const c of correos) {
    try { await tx.sendMail(c); } catch (e) { console.error('[reservas-web] no se pudo enviar un correo:', e && e.message); }
  }
}

module.exports = { catalogo, disponibilidad, crear, normalizar, diaSemana, ESTADOS_OCUPAN_CUPO, DIAS_MAXIMOS };
