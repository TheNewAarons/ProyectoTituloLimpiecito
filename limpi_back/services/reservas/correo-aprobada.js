/**
 * RF-BI-05 — Correos al cliente cuando cambia el estado de su reserva (mismo diseño que reserva-cliente.hbs):
 *   - aprobada: reemplaza el HTML de texto plano del legacy (routes/sist_app/Reserva.js, AUT-031);
 *   - rechazada: con el motivo (antes el cliente nunca se enteraba);
 *   - finalizada: "servicio realizado", cierra el ciclo con el cliente.
 * Fecha en español, pago legible y datos escapados (Handlebars).
 */
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const Extra = require('../../modelos/sist_app/Extra');
const ExtraLavado = require('../../modelos/sist_app/Extra_lavado');

const VISTAS = path.join(__dirname, '..', '..', 'views', 'reservas');
const LOGO = path.join(__dirname, '..', '..', 'views', 'ordenes-compra', 'logo-limpiecito.png');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// Texto para el cliente según metodo_pago; SIMULADO = reserva de la web de reservas (sin cobro en línea).
const PAGOS = { SIMULADO: 'Se coordina con el equipo (sin cobro en línea)', Transbank: 'Webpay (Transbank)', Transferencia: 'Transferencia', Efectivo: 'Efectivo' };
const plantillas = {};

/**
 * Fecha de la reserva -> 'martes 1 de diciembre de 2026' (el legacy mostraba Date.toString()).
 * fecha_reserva guarda el día (y la hora del bloque) escritos en UTC, igual que lo leen las consultas (DATE_FORMAT):
 * se formatea en UTC; en hora de Chile una reserva guardada a las 00:00 aparecería un día antes (revisión).
 */
function fechaLarga(valor) {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return String(valor || '');
  const ymd = d.toISOString().slice(0, 10).split('-').map(Number);
  return DIAS[new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2])).getUTCDay()] + ' ' + ymd[2] + ' de ' + MESES[ymd[1] - 1] + ' de ' + ymd[0];
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

function render(nombre, datos) {
  if (!plantillas[nombre]) plantillas[nombre] = handlebars.compile(fs.readFileSync(path.join(VISTAS, nombre + '.hbs'), 'utf8'));
  return plantillas[nombre](datos);
}

/** Datos comunes a los tres correos; busca dirección y vehículo en extras / extra_lavados. */
async function datosBase(d) {
  const r = d.reserva;
  const [extra, lavado] = await Promise.all([
    Extra.findOne({ where: { reservaId: r.id } }).catch(() => null),
    ExtraLavado.findOne({ where: { reservaId: r.id } }).catch(() => null)
  ]);
  const datosExtra = lavado || extra;
  return {
    orden: r.orden,
    nombre: d.usuario.nombre,
    servicio: d.servicio.nombre,
    fechaTexto: fechaLarga(r.fecha_reserva),
    hora: hhmm(r.hora_inicio),
    horario: hhmm(r.hora_inicio) + (r.hora_fin ? ' - ' + hhmm(r.hora_fin) : ''),
    direccion: datosExtra ? datosExtra.direccion : null,
    vehiculo: lavado ? [lavado.tipo, lavado.marca, lavado.modelo].filter(Boolean).join(' ') + (lavado.patente ? ' · ' + lavado.patente : '') : null,
    pago: PAGOS[r.metodo_pago] || r.metodo_pago || 'Por coordinar',
    pagado: !!r.pagado,
    total: clp(r.precio_total || r.precio)
  };
}

function correo(d, asunto, texto, html) {
  return {
    from: '"Aseo Limpiecito" <no-reply@aseolimpiecito.cl>',
    to: d.usuario.correo,
    subject: asunto,
    text: texto,
    html: html,
    attachments: fs.existsSync(LOGO) ? [{ filename: 'logo-limpiecito.png', path: LOGO, cid: 'logo-limpiecito' }] : []
  };
}

/** @param {{reserva:object, usuario:object, servicio:object}} d instancias (legacy o nuevas) */
async function armarCorreoAprobada(d) {
  const b = await datosBase(d);
  return correo(d, 'Tu reserva N° ' + b.orden + ' está confirmada',
    'Hola ' + b.nombre + ', tu reserva N° ' + b.orden + ' (' + b.servicio + ') está confirmada para el ' + b.fechaTexto + ' a las ' + b.hora +
    ' hrs. ¡Gracias por preferir Aseo Limpiecito!',
    render('reserva-aprobada', b));
}

/** @param {{reserva, usuario, servicio, motivo:string}} d */
async function armarCorreoRechazada(d) {
  const b = Object.assign(await datosBase(d), { motivo: d.motivo });
  return correo(d, 'No pudimos confirmar tu reserva N° ' + b.orden,
    'Hola ' + b.nombre + ', no pudimos confirmar tu reserva N° ' + b.orden + ' (' + b.servicio + ', ' + b.fechaTexto + ' ' + b.horario +
    ' hrs). Motivo: ' + d.motivo + '. Puedes reservar otro horario cuando quieras.',
    render('reserva-rechazada', b));
}

/** @param {{reserva, usuario, servicio}} d */
async function armarCorreoFinalizada(d) {
  const b = await datosBase(d);
  return correo(d, '¡Servicio realizado! Reserva N° ' + b.orden,
    'Hola ' + b.nombre + ', registramos como realizado tu servicio ' + b.servicio + ' del ' + b.fechaTexto + '. ¡Gracias por preferir Aseo Limpiecito!',
    render('reserva-finalizada', b));
}

module.exports = { armarCorreoAprobada, armarCorreoRechazada, armarCorreoFinalizada, fechaLarga };
