/**
 * RF-BI-03 — Análisis de consumo de bodega (solo lectura, D-BI-03-1..4).
 * "Solicitado" = cantidad_pedida de solicitudes no anuladas, por mes de creación.
 * "Consumido"  = cantidad_asignada de solicitudes ENTREGADA, por mes de entregada_at (la entrega solo ocurre
 * con todo asignado, RF-BOD-04). Stock crítico = misma regla que el dashboard de bodega (RF-BOD-05).
 * Merma (RF-BOD-04) = unidades rechazadas al recibir órdenes de compra, por mes de fecha_recepcion (recepciones confirmadas).
 * Las fechas se guardan en UTC: se filtra en SQL con ±1 día de margen y el mes se asigna en America/Santiago.
 */

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const financiero = require('./financiero');
const { SQL_BAJO_MINIMO } = require('../bodega/dashboard');
const { ESTADOS_SOLICITUD: E, PRODUCTO_ACTIVO } = require('../bodega/constantes');

const MESES_POR_DEFECTO = 6;
const LIMITE_TOP = { defecto: 10, max: 50 };
const AGRUPACIONES = ['mes', 'supervisor', 'centro_costo'];
const ESTADOS_COMPRA = ['ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA'];
const DIA_MS = 24 * 60 * 60 * 1000;

function consultar(sql, replacements) {
  return db.sequelize.query(sql, { replacements: replacements, type: db.sequelize.QueryTypes.SELECT });
}

/** desde/hasta 'YYYY-MM' con defecto: los últimos 6 meses terminando en el mes actual. */
function rango(desde, hasta) {
  const h = hasta || financiero.mesActual();
  financiero.validarRango(h, h); // antes de derivar desde: un hasta inválido se informa como hasta
  const d =desde || financiero.indiceAPeriodo(financiero.periodoAIndice(h) - (MESES_POR_DEFECTO - 1));
  financiero.validarRango(d, h);
  return { desde: d, hasta: h };
}

/** Ventana UTC que cubre el rango en Santiago con 1 día de margen a cada lado (se recorta luego en JS). */
function ventanaUtc(r) {
  const i = financiero.periodoAIndice(r.desde);
  const f = financiero.periodoAIndice(r.hasta) + 1;
  return {
    ini: new Date(Date.UTC(Math.floor(i / 12), i % 12, 1) - DIA_MS),
    fin: new Date(Date.UTC(Math.floor(f / 12), f % 12, 1) + DIA_MS)
  };
}

function enRango(valor, r) {
  const p = fecha.periodoSantiago(valor);
  return p !== null && p >= r.desde && p <= r.hasta;
}

function entero(v) { return Number(v) || 0; }

// shortcut: trae las líneas del rango y agrega en JS (volumen de bodega: cientos de solicitudes/mes); pasar a GROUP BY con
// CONVERT_TZ si el rango de 36 meses supera ~2 s (SCRUM-29).
function lineasSolicitudes(r) {
  const v = ventanaUtc(r);
  return consultar(
    'SELECT si.producto_id, p.nombre AS producto, si.cantidad_pedida, si.cantidad_asignada, s.id AS solicitud_id, s.estado, ' +
    's.created_at, s.entregada_at, s.trabajador_id, s.usuario_id, s.centro_costo_id, ' +
    't.nombre AS t_nombre, t.apellido AS t_apellido, u.nombre AS u_nombre, u.apellido AS u_apellido, ' +
    'cc.numero_cc, cl.representante AS cliente ' +
    'FROM solicitud_items si JOIN solicitudes_bodega s ON s.id = si.solicitud_id ' +
    'LEFT JOIN productos p ON p.id = si.producto_id LEFT JOIN trabajadores t ON t.id = s.trabajador_id ' +
    'LEFT JOIN usuarios u ON u.id = s.usuario_id LEFT JOIN centro_costos cc ON cc.id = s.centro_costo_id ' +
    'LEFT JOIN clientes cl ON cl.id = cc.clienteId ' +
    'WHERE s.estado <> :anulada AND ((s.created_at >= :ini AND s.created_at < :fin) OR (s.entregada_at >= :ini AND s.entregada_at < :fin))',
    { anulada: E.ANULADA, ini: v.ini, fin: v.fin });
}

function nombreProducto(l) { return l.producto || 'Producto ' + l.producto_id; }

/**
 * Ranking por cantidad pedida (puro).
 * @returns {object[]} [{posicion, producto_id, producto, cantidad_pedida, cantidad_entregada, solicitudes}]
 */
function armarTop(lineas, r, limite) {
  const m = {};
  lineas.forEach(function (l) {
    const pedido = enRango(l.created_at, r);
    const entregado = l.estado === E.ENTREGADA && enRango(l.entregada_at, r);
    if (!pedido && !entregado) return;
    const f = m[l.producto_id] || (m[l.producto_id] = { producto_id: l.producto_id, producto: nombreProducto(l), cantidad_pedida: 0, cantidad_entregada: 0, solicitudes: {} });
    if (pedido) { f.cantidad_pedida += entero(l.cantidad_pedida); f.solicitudes[l.solicitud_id] = true; }
    if (entregado) f.cantidad_entregada += entero(l.cantidad_asignada);
  });
  return Object.keys(m).map(function (k) { const f = m[k]; f.solicitudes = Object.keys(f.solicitudes).length; return f; })
    .filter(function (f) { return f.cantidad_pedida > 0; })
    .sort(function (a, b) { return b.cantidad_pedida - a.cantidad_pedida || a.producto.localeCompare(b.producto); })
    .slice(0, limite)
    .map(function (f, i) { f.posicion = i + 1; return f; });
}

function claveGrupo(l, agrupar) {
  if (agrupar === 'centro_costo') {
    if (!l.centro_costo_id) return { clave: 'sin', etiqueta: 'Sin centro de costo', id: null };
    return { clave: 'cc' + l.centro_costo_id, id: l.centro_costo_id, etiqueta: 'CC ' + (l.numero_cc || l.centro_costo_id) + (l.cliente ? ' · ' + l.cliente : '') };
  }
  // D-BI-03-2: supervisor = trabajador que pidió desde la app; si la pidió un usuario web, se agrupa por ese usuario.
  if (l.trabajador_id) return { clave: 't' + l.trabajador_id, id: l.trabajador_id, tipo: 'TRABAJADOR', etiqueta: ((l.t_nombre || '') + ' ' + (l.t_apellido || '')).trim() || 'Trabajador ' + l.trabajador_id };
  if (l.usuario_id) return { clave: 'u' + l.usuario_id, id: l.usuario_id, tipo: 'USUARIO', etiqueta: (((l.u_nombre || '') + ' ' + (l.u_apellido || '')).trim() || 'Usuario ' + l.usuario_id) + ' (web)' };
  return { clave: 'sin', id: null, tipo: null, etiqueta: 'Sin solicitante' };
}

/**
 * Consumo entregado agrupado (puro). agrupar=mes devuelve todos los meses del rango (con 0).
 * @returns {object[]}
 */
function armarConsumo(lineas, r, agrupar, productoId) {
  const entregadas = lineas.filter(function (l) {
    return l.estado === E.ENTREGADA && enRango(l.entregada_at, r) && (!productoId || Number(l.producto_id) === productoId);
  });
  if (agrupar === 'mes') {
    const m = {};
    financiero.rangoPeriodos(r.desde, r.hasta).forEach(function (p) { m[p] = { periodo: p, cantidad: 0, solicitudes: {} }; });
    entregadas.forEach(function (l) { const f = m[fecha.periodoSantiago(l.entregada_at)]; f.cantidad += entero(l.cantidad_asignada); f.solicitudes[l.solicitud_id] = true; });
    return Object.keys(m).sort().map(function (k) { return { periodo: k, cantidad: m[k].cantidad, solicitudes: Object.keys(m[k].solicitudes).length }; });
  }
  const g = {};
  entregadas.forEach(function (l) {
    const k = claveGrupo(l, agrupar);
    const f = g[k.clave] || (g[k.clave] = { id: k.id, tipo: k.tipo, etiqueta: k.etiqueta, cantidad: 0, solicitudes: {}, productos: {} });
    f.cantidad += entero(l.cantidad_asignada);
    f.solicitudes[l.solicitud_id] = true;
    f.productos[l.producto_id] = true;
  });
  return Object.keys(g).map(function (k) {
    const f = g[k];
    const fila = { id: f.id, etiqueta: f.etiqueta, cantidad: f.cantidad, solicitudes: Object.keys(f.solicitudes).length, productos: Object.keys(f.productos).length };
    if (agrupar === 'supervisor') fila.tipo = f.tipo;
    return fila;
  }).sort(function (a, b) { return b.cantidad - a.cantidad || a.etiqueta.localeCompare(b.etiqueta); });
}

/**
 * Frecuencia de compra por producto (puro). Fecha de compra = enviada_at (o created_at si falta).
 * @returns {object[]} [{producto_id, producto, ordenes, cantidad, ultima_compra, dias_promedio_entre_compras}]
 */
function armarFrecuencia(lineas, r) {
  const m = {};
  lineas.forEach(function (l) {
    const f0 = l.enviada_at || l.created_at;
    if (!enRango(f0, r)) return;
    const f = m[l.producto_id] || (m[l.producto_id] = { producto_id: l.producto_id, producto: nombreProducto(l), cantidad: 0, fechas: {} });
    f.cantidad += entero(l.cantidad);
    f.fechas[l.orden_id] = new Date(f0).getTime();
  });
  return Object.keys(m).map(function (k) {
    const f = m[k];
    const t = Object.keys(f.fechas).map(function (o) { return f.fechas[o]; }).sort(function (a, b) { return a - b; });
    return {
      producto_id: f.producto_id, producto: f.producto, ordenes: t.length, cantidad: f.cantidad,
      ultima_compra: new Date(t[t.length - 1]).toISOString(),
      dias_promedio_entre_compras: t.length < 2 ? null : Math.round(((t[t.length - 1] - t[0]) / (t.length - 1) / DIA_MS) * 10) / 10
    };
  }).sort(function (a, b) { return b.ordenes - a.ordenes || b.cantidad - a.cantidad || a.producto.localeCompare(b.producto); });
}

/**
 * Merma por producto (puro): recibido vs rechazado en recepciones del rango, % de merma y costo estimado de lo rechazado
 * (costo real de la recepción o, sin él, el de la OC). Incluye todo producto recibido en el período, con o sin merma.
 * @returns {{productos: object[], por_mes: object[], totales: object}}
 */
function armarMerma(lineas, r) {
  const m = {};
  const meses = {};
  financiero.rangoPeriodos(r.desde, r.hasta).forEach(function (p) { meses[p] = { periodo: p, recibido: 0, rechazado: 0 }; });
  lineas.forEach(function (l) {
    if (!enRango(l.fecha_recepcion, r)) return;
    const rechazado = entero(l.cantidad_rechazada);
    const recibido = entero(l.cantidad);
    const costo = l.costo_unitario !== null && l.costo_unitario !== undefined ? l.costo_unitario : l.costo_oc;
    const f = m[l.producto_id] || (m[l.producto_id] = {
      producto_id: l.producto_id, producto: nombreProducto(l), recibido: 0, rechazado: 0, costo_merma: 0, recepciones_con_rechazo: 0, ultimo_motivo: null, t: 0
    });
    f.recibido += recibido;
    f.rechazado += rechazado;
    const mes = meses[fecha.periodoSantiago(l.fecha_recepcion)];
    mes.recibido += recibido;
    mes.rechazado += rechazado;
    if (rechazado > 0) {
      f.recepciones_con_rechazo += 1;
      if (costo !== null && costo !== undefined) f.costo_merma += rechazado * entero(costo);
      const t = new Date(l.fecha_recepcion).getTime();
      if (t >= f.t) { f.t = t; f.ultimo_motivo = l.motivo_rechazo || null; }
    }
  });
  const porcentaje = function (rech, rec) { return rech + rec === 0 ? 0 : Math.round((rech / (rech + rec)) * 1000) / 10; };
  const productos = Object.keys(m).map(function (k) {
    const f = m[k];
    return {
      producto_id: f.producto_id, producto: f.producto, recibido: f.recibido, rechazado: f.rechazado, porcentaje_merma: porcentaje(f.rechazado, f.recibido),
      costo_merma: f.costo_merma, recepciones_con_rechazo: f.recepciones_con_rechazo, ultimo_motivo: f.ultimo_motivo
    };
  }).filter(function (f) { return f.recibido + f.rechazado > 0; })
    .sort(function (a, b) { return b.rechazado - a.rechazado || b.porcentaje_merma - a.porcentaje_merma || a.producto.localeCompare(b.producto); });
  const tot = productos.reduce(function (a, f) { a.recibido += f.recibido; a.rechazado += f.rechazado; a.costo_merma += f.costo_merma; return a; },
    { recibido: 0, rechazado: 0, costo_merma: 0 });
  tot.porcentaje_merma = porcentaje(tot.rechazado, tot.recibido);
  return { productos: productos, por_mes: Object.keys(meses).sort().map(function (k) { return meses[k]; }), totales: tot };
}

async function topProductos(q) {
  const r = rango(q.desde, q.hasta);
  let limite = LIMITE_TOP.defecto;
  if (q.limite !== undefined) {
    limite = Number(q.limite);
    if (!/^\d+$/.test(String(q.limite)) || limite < 1 || limite > LIMITE_TOP.max) {
      throw new AppError('CAMPO_INVALIDO', 'limite debe ser un entero entre 1 y ' + LIMITE_TOP.max, 400, { limite: q.limite });
    }
  }
  return { data: armarTop(await lineasSolicitudes(r), r, limite), meta: { desde: r.desde, hasta: r.hasta, limite: limite } };
}

async function consumo(q) {
  const r = rango(q.desde, q.hasta);
  const agrupar = q.agrupar === undefined ? 'mes' : q.agrupar;
  if (AGRUPACIONES.indexOf(agrupar) === -1) {
    throw new AppError('CAMPO_INVALIDO', 'agrupar debe ser ' + AGRUPACIONES.join(', '), 400, { agrupar: q.agrupar });
  }
  let productoId = null;
  if (q.producto_id !== undefined && q.producto_id !== '') {
    productoId = Number(q.producto_id);
    if (!/^\d+$/.test(String(q.producto_id)) || productoId < 1 || !Number.isSafeInteger(productoId)) {
      throw new AppError('CAMPO_INVALIDO', 'producto_id debe ser un entero mayor a 0', 400, { producto_id: q.producto_id });
    }
  }
  const data = armarConsumo(await lineasSolicitudes(r), r, agrupar, productoId);
  return {
    data: data,
    meta: { desde: r.desde, hasta: r.hasta, agrupar: agrupar, producto_id: productoId, total: data.reduce(function (a, f) { return a + f.cantidad; }, 0) }
  };
}

async function frecuenciaCompra(q) {
  const r = rango(q.desde, q.hasta);
  const v = ventanaUtc(r);
  const lineas = await consultar(
    'SELECT oi.orden_id, oi.producto_id, p.nombre AS producto, oi.cantidad, o.enviada_at, o.created_at ' +
    'FROM orden_compra_items oi JOIN ordenes_compra o ON o.id = oi.orden_id LEFT JOIN productos p ON p.id = oi.producto_id ' +
    'WHERE o.estado IN (:estados) AND COALESCE(o.enviada_at, o.created_at) >= :ini AND COALESCE(o.enviada_at, o.created_at) < :fin',
    { estados: ESTADOS_COMPRA, ini: v.ini, fin: v.fin });
  return { data: armarFrecuencia(lineas, r), meta: { desde: r.desde, hasta: r.hasta, estados: ESTADOS_COMPRA } };
}

async function merma(q) {
  const r = rango(q.desde, q.hasta);
  const v = ventanaUtc(r);
  const lineas = await consultar(
    'SELECT ri.producto_id, p.nombre AS producto, ri.cantidad, ri.cantidad_rechazada, ri.motivo_rechazo, ri.costo_unitario, ' +
    'oi.costo_unitario AS costo_oc, rc.fecha_recepcion ' +
    'FROM recepcion_items ri JOIN recepciones_compra rc ON rc.id = ri.recepcion_id ' +
    'LEFT JOIN orden_compra_items oi ON oi.id = ri.orden_item_id LEFT JOIN productos p ON p.id = ri.producto_id ' +
    'WHERE rc.estado = :confirmada AND rc.fecha_recepcion >= :ini AND rc.fecha_recepcion < :fin',
    { confirmada: 'CONFIRMADA', ini: v.ini, fin: v.fin });
  const a = armarMerma(lineas, r);
  return { data: a.productos, meta: Object.assign({ desde: r.desde, hasta: r.hasta, por_mes: a.por_mes }, a.totales) };
}

/** Productos activos en o bajo el mínimo (misma regla SQL que el dashboard de bodega), los más faltantes primero. */
async function stockCritico() {
  const filas = await consultar(
    'SELECT id, nombre, COALESCE(stock, 0) AS stock, stock_minimo FROM productos WHERE estado = :activo AND ' + SQL_BAJO_MINIMO +
    ' ORDER BY (stock_minimo - COALESCE(stock, 0)) DESC, nombre ASC', { activo: PRODUCTO_ACTIVO });
  const data = filas.map(function (p) {
    const stock = entero(p.stock);
    const minimo = entero(p.stock_minimo);
    return { producto_id: p.id, producto: p.nombre, stock: stock, stock_minimo: minimo, faltante: minimo - stock };
  });
  return { data: data, meta: { total: data.length } };
}

module.exports = {
  armarTop: armarTop, armarConsumo: armarConsumo, armarFrecuencia: armarFrecuencia, armarMerma: armarMerma, ventanaUtc: ventanaUtc, rango: rango,
  topProductos: topProductos, consumo: consumo, frecuenciaCompra: frecuenciaCompra, stockCritico: stockCritico, merma: merma
};
