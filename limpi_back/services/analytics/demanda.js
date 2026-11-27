/**
 * RF-BI-05 (SCRUM-22) — Predicción de demanda de la app de reservas (solo lectura).
 * - Mapa de calor día de la semana × hora de inicio, ranking de servicios y serie mensual (temporada) del período.
 * - Proyección simple de las próximas 4 semanas: promedio por día de la semana de las últimas 8 semanas
 *   (se desactiva con mensaje si no hay 8 semanas de historial, como pide la especificación).
 * - Dotación = cupos del horario (bloques activos del día × cant_servicios por categoría): es el límite que usa la app.
 *   Alerta cuando la demanda del día (proyectada o ya agendada, la mayor) supera esos cupos.
 * Las rechazadas (4) no cuentan como demanda; se informan aparte.
 */
const Sequelize = require('sequelize');
const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const financiero = require('./financiero');

const RECHAZADO = 4;
const OCUPAN_CUPO = [2, 3]; // aprobadas y en proceso (misma regla de cupo que la app)
const MESES_POR_DEFECTO = 12;
const SEMANAS_HISTORIAL = 8;
const DIAS_PROYECCION = 28;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]; // lunes primero

const consultar = (sql, r) => db.sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
const sinTilde = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const diaDe = (ymd) => { const p = ymd.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); };
const sumarDias = (ymd, n) => { const p = ymd.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); };
const redondear1 = (n) => Math.round(n * 10) / 10;

/** desde/hasta 'YYYY-MM' (por defecto los últimos 12 meses) y categoria_id opcional. */
function filtros(q) {
  const h = q.hasta || financiero.mesActual();
  financiero.validarRango(h, h);
  const d = q.desde || financiero.indiceAPeriodo(financiero.periodoAIndice(h) - (MESES_POR_DEFECTO - 1));
  financiero.validarRango(d, h);
  let categoria = null;
  if (q.categoria_id !== undefined && q.categoria_id !== '') {
    const n = Number(q.categoria_id);
    if (!/^\d+$/.test(String(q.categoria_id)) || !Number.isSafeInteger(n) || n <= 0) {
      throw new AppError('CAMPO_INVALIDO', 'categoria_id debe ser un entero mayor a 0', 400, { categoria_id: q.categoria_id });
    }
    categoria = n;
  }
  return { desde: d, hasta: h, categoria_id: categoria };
}

const FILTRO_CATEGORIA = (f) => (f.categoria_id ? ' AND s.categoriaServicioId = :categoria' : '');

/** Reservas entre dos días 'YYYY-MM-DD' (inclusive) con su servicio y categoría. */
function reservasEntre(ini, fin, f) {
  return consultar(
    "SELECT r.id, DATE_FORMAT(r.fecha_reserva, '%Y-%m-%d') dia, TIME_FORMAT(r.hora_inicio, '%H:%i') hora, r.estado, r.precio_total, " +
    's.id servicio_id, s.nombre servicio, c.id categoria_id, c.nombre categoria ' +
    'FROM reservas r JOIN servicios s ON s.id = r.servicioId JOIN categoria_servicios c ON c.id = s.categoriaServicioId ' +
    "WHERE DATE_FORMAT(r.fecha_reserva, '%Y-%m-%d') BETWEEN :ini AND :fin" + FILTRO_CATEGORIA(f),
    { ini: ini, fin: fin, categoria: f.categoria_id });
}

/** Cupos por día de la semana (0..6) sumando las categorías del filtro. */
async function cuposPorDia(f) {
  const filas = await consultar(
    'SELECT d.nombre dia, h.cant_servicios, COUNT(b.id) bloques FROM horarios h JOIN dias d ON d.horarioId = h.id ' +
    'JOIN bloques b ON b.diaId = d.id AND b.activo = 1 WHERE h.estado = 1 AND d.estado = 1' +
    (f.categoria_id ? ' AND h.categoriaServicioId = :categoria' : '') + ' GROUP BY h.id, d.id, d.nombre, h.cant_servicios',
    { categoria: f.categoria_id });
  const cupos = [0, 0, 0, 0, 0, 0, 0];
  filas.forEach((x) => {
    const i = DIAS.findIndex((n) => sinTilde(n) === sinTilde(x.dia));
    if (i >= 0) cupos[i] += Number(x.bloques) * Number(x.cant_servicios);
  });
  return cupos;
}

/** Arma los indicadores del período a partir de las filas (puro, para testear). */
function describir(filas) {
  const validas = filas.filter((x) => Number(x.estado) !== RECHAZADO);
  const horas = Array.from(new Set(validas.map((x) => x.hora))).sort();
  const celdas = {};
  validas.forEach((x) => { const k = diaDe(x.dia) + '|' + x.hora; celdas[k] = (celdas[k] || 0) + 1; });
  const mapa = ORDEN_DIAS.map((i) => ({ dia: DIAS[i], valores: horas.map((h) => celdas[i + '|' + h] || 0) }));

  const porServicio = {};
  validas.forEach((x) => {
    const s = porServicio[x.servicio_id] || (porServicio[x.servicio_id] = { servicio_id: Number(x.servicio_id), servicio: x.servicio, categoria: x.categoria, reservas: 0, monto: 0 });
    s.reservas += 1;
    s.monto += Number(x.precio_total) || 0;
  });
  const ranking = Object.values(porServicio).sort((a, b) => b.reservas - a.reservas || b.monto - a.monto || a.servicio.localeCompare(b.servicio));

  const porMes = {};
  validas.forEach((x) => {
    const p = x.dia.slice(0, 7);
    const m = porMes[p] || (porMes[p] = { periodo: p, total: 0, por_categoria: {} });
    m.total += 1;
    m.por_categoria[x.categoria] = (m.por_categoria[x.categoria] || 0) + 1;
  });
  const temporada = Object.values(porMes).sort((a, b) => a.periodo.localeCompare(b.periodo));

  const rechazadas = filas.length - validas.length;
  return {
    resumen: {
      reservas: validas.length,
      rechazadas: rechazadas,
      tasa_rechazo: filas.length ? redondear1((rechazadas / filas.length) * 100) : 0,
      monto: validas.reduce((s, x) => s + (Number(x.precio_total) || 0), 0),
      dia_pico: mapa.reduce((m, d) => { const t = d.valores.reduce((a, b) => a + b, 0); return t > m.total ? { dia: d.dia, total: t } : m; }, { dia: null, total: 0 }).dia,
      servicio_top: ranking.length ? ranking[0].servicio : null
    },
    mapa_calor: { horas: horas, dias: mapa },
    ranking: ranking,
    temporada: temporada
  };
}

/**
 * Proyección de las próximas 4 semanas (puro, para testear).
 * @param {object[]} historial filas de las últimas 8 semanas (antes de hoy)
 * @param {object[]} futuras filas desde mañana (agendadas)
 * @param {number[]} cupos por día de la semana
 * @param {string} hoy 'YYYY-MM-DD'
 * @param {string|null} primera fecha de la primera reserva (para saber si hay historial suficiente)
 */
function proyectar(historial, futuras, cupos, hoy, primera) {
  const inicioHistorial = sumarDias(hoy, -SEMANAS_HISTORIAL * 7);
  if (!primera || primera > inicioHistorial) {
    return {
      disponible: false,
      mensaje: 'Se necesitan al menos ' + SEMANAS_HISTORIAL + ' semanas de reservas para proyectar; por ahora se muestran solo las métricas del período.',
      dias: [], alertas: []
    };
  }
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  historial.filter((x) => Number(x.estado) !== RECHAZADO).forEach((x) => { porDia[diaDe(x.dia)] += 1; });
  const agendadas = {};
  futuras.filter((x) => OCUPAN_CUPO.indexOf(Number(x.estado)) !== -1).forEach((x) => { agendadas[x.dia] = (agendadas[x.dia] || 0) + 1; });

  const dias = [];
  for (let i = 1; i <= DIAS_PROYECCION; i++) {
    const f = sumarDias(hoy, i);
    const d = diaDe(f);
    const proyectado = redondear1(porDia[d] / SEMANAS_HISTORIAL);
    const ya = agendadas[f] || 0;
    // Reservas esperadas enteras: un promedio de 0,1 no es "demanda" que supere los cupos.
    const demanda = Math.max(Math.round(proyectado), ya);
    dias.push({
      fecha: f, dia: DIAS[d], proyectado: proyectado, agendadas: ya, capacidad: cupos[d],
      ocupacion: cupos[d] ? Math.round((demanda / cupos[d]) * 100) : null,
      excede: demanda > cupos[d]
    });
  }
  const semanas = [0, 1, 2, 3].map((s) => {
    const tramo = dias.slice(s * 7, s * 7 + 7);
    return {
      desde: tramo[0].fecha, hasta: tramo[6].fecha,
      proyectado: redondear1(tramo.reduce((a, x) => a + x.proyectado, 0)),
      agendadas: tramo.reduce((a, x) => a + x.agendadas, 0),
      capacidad: tramo.reduce((a, x) => a + x.capacidad, 0)
    };
  });
  return {
    disponible: true,
    base: 'Promedio por día de la semana de las últimas ' + SEMANAS_HISTORIAL + ' semanas (' + inicioHistorial + ' a ' + sumarDias(hoy, -1) + ').',
    dias: dias,
    semanas: semanas,
    alertas: dias.filter((x) => x.excede).map((x) => ({
      fecha: x.fecha, dia: x.dia, demanda: Math.max(Math.round(x.proyectado), x.agendadas), capacidad: x.capacidad,
      mensaje: x.capacidad ? 'La demanda supera los cupos del día' : 'Hay demanda en un día sin horario de atención'
    }))
  };
}

/** GET /api/v1/analytics/demanda?desde=&hasta=&categoria_id= */
async function demanda(q, hoyOpcional) {
  const f = filtros(q || {});
  const hoy = hoyOpcional || fecha.hoySantiago();
  const finPeriodo = financiero.indiceAPeriodo(financiero.periodoAIndice(f.hasta) + 1) + '-01';
  const [periodo, historial, futuras, cupos, primera] = await Promise.all([
    reservasEntre(f.desde + '-01', sumarDias(finPeriodo, -1), f),
    reservasEntre(sumarDias(hoy, -SEMANAS_HISTORIAL * 7), sumarDias(hoy, -1), f),
    reservasEntre(sumarDias(hoy, 1), sumarDias(hoy, DIAS_PROYECCION), f),
    cuposPorDia(f),
    consultar("SELECT DATE_FORMAT(MIN(r.fecha_reserva), '%Y-%m-%d') primera FROM reservas r JOIN servicios s ON s.id = r.servicioId WHERE 1 = 1" +
      FILTRO_CATEGORIA(f), { categoria: f.categoria_id })
  ]);
  const categorias = await consultar('SELECT id, nombre FROM categoria_servicios WHERE estado = 1 ORDER BY id', {});
  return {
    data: Object.assign(describir(periodo), {
      proyeccion: proyectar(historial, futuras, cupos, hoy, primera[0] ? primera[0].primera : null),
      cupos_por_dia: ORDEN_DIAS.map((i) => ({ dia: DIAS[i], cupos: cupos[i] }))
    }),
    meta: { desde: f.desde, hasta: f.hasta, categoria_id: f.categoria_id, hoy: hoy, categorias: categorias }
  };
}

const ESTADOS_TEXTO = { 1: 'Finalizada', 2: 'Aprobada', 3: 'En proceso', 4: 'Rechazada' };

/**
 * Agenda de un día (puro, para testear): ocupación por categoría y bloque, y la lista de reservas del día.
 * @param {string} ymd
 * @param {object[]} bloques filas {categoria_id, categoria, dia, inicio, fin, cant_servicios}
 * @param {object[]} reservas filas del día con datos de cliente y servicio
 */
function armarDia(ymd, bloques, reservas) {
  const dia = diaDe(ymd);
  const porCategoria = new Map();
  bloques.filter((b) => sinTilde(b.dia) === sinTilde(DIAS[dia])).forEach((b) => {
    if (!porCategoria.has(b.categoria_id)) porCategoria.set(b.categoria_id, { id: Number(b.categoria_id), nombre: b.categoria, bloques: [] });
    porCategoria.get(b.categoria_id).bloques.push({ inicio: b.inicio, fin: b.fin, cupos: Number(b.cant_servicios), aprobadas: 0, en_proceso: 0 });
  });
  reservas.forEach((r) => {
    let c = porCategoria.get(r.categoria_id);
    // Reserva fuera del horario configurado (p. ej. datos antiguos o un bloque desactivado): se muestra igual.
    if (!c) { c = { id: Number(r.categoria_id), nombre: r.categoria, bloques: [] }; porCategoria.set(r.categoria_id, c); }
    let b = c.bloques.find((x) => x.inicio === r.hora);
    if (!b) { b = { inicio: r.hora, fin: r.hora_fin, cupos: 0, aprobadas: 0, en_proceso: 0, fuera_de_horario: true }; c.bloques.push(b); }
    if (Number(r.estado) === 2) b.aprobadas += 1;
    if (Number(r.estado) === 3) b.en_proceso += 1;
  });
  const categorias = Array.from(porCategoria.values()).map((c) => {
    c.bloques.sort((a, b) => a.inicio.localeCompare(b.inicio));
    c.bloques.forEach((b) => { b.ocupados = b.aprobadas + b.en_proceso; b.libres = Math.max(b.cupos - b.ocupados, 0); });
    c.cupos = c.bloques.reduce((s, b) => s + b.cupos, 0);
    c.ocupados = c.bloques.reduce((s, b) => s + b.ocupados, 0);
    return c;
  }).sort((a, b) => a.id - b.id);
  return {
    fecha: ymd,
    dia: DIAS[dia],
    atiende: categorias.some((c) => c.cupos > 0),
    resumen: {
      reservas: reservas.length,
      ocupan_cupo: reservas.filter((r) => OCUPAN_CUPO.indexOf(Number(r.estado)) !== -1).length,
      cupos: categorias.reduce((s, c) => s + c.cupos, 0)
    },
    categorias: categorias,
    reservas: reservas.map((r) => ({
      id: Number(r.id), orden: r.orden, hora: r.hora, hora_fin: r.hora_fin, servicio: r.servicio, categoria: r.categoria,
      cliente: r.cliente, celular: r.celular, cantidad: Number(r.cantidad) || 1, precio_total: Number(r.precio_total) || 0,
      estado: Number(r.estado), estado_texto: ESTADOS_TEXTO[r.estado] || String(r.estado),
      // Trazabilidad del origen: las reservas de la web de reservas (RF-BI-05) llevan pago SIMULADO.
      origen: r.metodo_pago === 'SIMULADO' ? 'Web (simulada)' : 'App',
      metodo_pago: r.metodo_pago, fecha_creacion: r.fecha_creacion
    }))
  };
}

/** GET /api/v1/analytics/demanda/dia?fecha=YYYY-MM-DD&categoria_id= */
async function delDia(q) {
  const qq = q || {};
  const ymd = qq.fecha || fecha.hoySantiago();
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd) || new Date(ymd + 'T00:00:00Z').toISOString().slice(0, 10) !== ymd) {
    throw new AppError('CAMPO_INVALIDO', 'fecha debe ser YYYY-MM-DD', 400, { fecha: qq.fecha });
  }
  const f = filtros({ categoria_id: qq.categoria_id });
  const [bloques, reservas] = await Promise.all([
    consultar(
      "SELECT h.categoriaServicioId categoria_id, c.nombre categoria, d.nombre dia, TIME_FORMAT(b.hora_inicio, '%H:%i') inicio, " +
      "TIME_FORMAT(b.hora_fin, '%H:%i') fin, h.cant_servicios FROM horarios h JOIN categoria_servicios c ON c.id = h.categoriaServicioId " +
      'JOIN dias d ON d.horarioId = h.id JOIN bloques b ON b.diaId = d.id AND b.activo = 1 WHERE h.estado = 1 AND d.estado = 1 AND c.estado = 1' +
      (f.categoria_id ? ' AND h.categoriaServicioId = :categoria' : '') + ' ORDER BY h.categoriaServicioId, b.hora_inicio',
      { categoria: f.categoria_id }),
    consultar(
      "SELECT r.id, r.orden, TIME_FORMAT(r.hora_inicio, '%H:%i') hora, TIME_FORMAT(r.hora_fin, '%H:%i') hora_fin, r.estado, r.cantidad, " +
      "r.precio_total, r.metodo_pago, DATE_FORMAT(r.fecha_creacion, '%Y-%m-%d %H:%i') fecha_creacion, s.nombre servicio, " +
      'c.id categoria_id, c.nombre categoria, u.nombre cliente, u.celular ' +
      'FROM reservas r JOIN servicios s ON s.id = r.servicioId JOIN categoria_servicios c ON c.id = s.categoriaServicioId ' +
      'LEFT JOIN usuario_apps u ON u.id = r.usuarioAppId ' +
      "WHERE DATE_FORMAT(r.fecha_reserva, '%Y-%m-%d') = :dia" + FILTRO_CATEGORIA(f) + ' ORDER BY r.hora_inicio, r.id',
      { dia: ymd, categoria: f.categoria_id })
  ]);
  return { data: armarDia(ymd, bloques, reservas), meta: { fecha: ymd, categoria_id: f.categoria_id, hoy: fecha.hoySantiago() } };
}

module.exports = { demanda, delDia, armarDia, filtros, describir, proyectar, cuposPorDia };
