/**
 * RF-BI-02 — Rentabilidad por cliente / centro de costo (vistas v_bi_rent_*, D-165…D-174).
 * Invariante (solo ingresos reales, D-170): Σ margen − gastos_generales = utilidad_total de BI-01.
 * El ingreso estimado (CONTRATO_ESTIMADO), OTRO_ESTIMADO y lo facturado van aparte y nunca entran a ella.
 */

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const financiero = require('./financiero');
const { aEnteroCLP } = require('../caja/saldo');

const MAX_MESES_RANGO = 36;

function consultar(sql, replacements) {
  return db.sequelize.query(sql, { replacements: replacements, type: db.sequelize.QueryTypes.SELECT });
}

/** @returns {string} 'CAJA' | 'CONTRATO_ESTIMADO' | 'MIXTO' | 'SIN_INGRESO' */
function origenIngreso(real, estimado) {
  if (real > 0 && estimado > 0) return 'MIXTO';
  if (real > 0) return 'CAJA';
  if (estimado > 0) return 'CONTRATO_ESTIMADO';
  return 'SIN_INGRESO';
}

/** Margen, margen % (1 decimal, null sin ingreso real) y pérdida (D-172: incluye lo estimado). */
function calcularMargen(f) {
  f.costo_total = f.costo_sueldos + f.costo_bodega + f.costo_otros;
  f.margen = f.ingreso_real - f.costo_total;
  f.margen_pct = f.ingreso_real === 0 ? null : Math.round((f.margen / f.ingreso_real) * 1000) / 10;
  f.margen_con_estimado = f.margen + f.ingreso_estimado - f.egreso_estimado;
  f.en_perdida = f.margen_con_estimado < 0;
  f.origen_ingreso = origenIngreso(f.ingreso_real, f.ingreso_estimado);
  return f;
}

const COLUMNA_COSTO = { SUELDO: 'costo_sueldos', BODEGA: 'costo_bodega', OTRO: 'costo_otros', OTRO_ESTIMADO: 'egreso_estimado' };

function filaVacia(clienteId, cliente) {
  return {
    tipo: 'CLIENTE', posicion: null, cliente_id: clienteId, cliente: cliente, centros: [],
    ingreso_real: 0, ingreso_estimado: 0, ingreso_facturado: 0,
    costo_sueldos: 0, costo_bodega: 0, costo_otros: 0, egreso_estimado: 0
  };
}

/**
 * Arma ranking + fila de gastos generales + meta a partir de las filas de las vistas (puro, sin BD).
 * Cada fila de entrada trae centro_costo_id, cliente_id, cliente, numero_cc.
 * @param {{ingresos: object[], costos: object[], facturado: object[], egresosSinCentro: number, utilidadTotal: number}} e
 * @returns {{filas: object[], totales: object, utilidad_total: number, diferencia_conciliacion: number, cuadra: boolean, estimacion: boolean}}
 */
function armarRentabilidad(e) {
  const porCliente = {};
  // Centros sin cliente: una fila por centro (D: "Sin cliente (CC n)")
  function fila(r) {
    const clave = r.cliente_id === null || r.cliente_id === undefined ? 'cc' + r.centro_costo_id : 'cl' + r.cliente_id;
    if (!porCliente[clave]) {
      porCliente[clave] = filaVacia(r.cliente_id === undefined ? null : r.cliente_id,
        r.cliente_id === null || r.cliente_id === undefined ? 'Sin cliente (CC ' + (r.numero_cc || r.centro_costo_id) + ')' : (r.cliente || 'Cliente ' + r.cliente_id));
    }
    const f = porCliente[clave];
    if (!f.centros.some(function (c) { return c.centro_costo_id === r.centro_costo_id; })) {
      f.centros.push({ centro_costo_id: r.centro_costo_id, numero_cc: r.numero_cc });
    }
    return f;
  }

  e.ingresos.forEach(function (r) {
    const f = fila(r);
    f.ingreso_real += aEnteroCLP(r.ingreso_real);
    f.ingreso_estimado += aEnteroCLP(r.ingreso_estimado);
  });
  let bodega = 0;
  e.costos.forEach(function (r) {
    const col = COLUMNA_COSTO[r.tipo];
    if (!col) return;
    const monto = aEnteroCLP(r.monto);
    fila(r)[col] += monto;
    if (r.tipo === 'BODEGA') bodega += monto;
  });
  e.facturado.forEach(function (r) { fila(r).ingreso_facturado += aEnteroCLP(r.ingreso_facturado); });

  const filas = Object.keys(porCliente).map(function (k) { return calcularMargen(porCliente[k]); });
  filas.sort(function (a, b) {
    return b.margen_con_estimado - a.margen_con_estimado || String(a.cliente_id).localeCompare(String(b.cliente_id));
  });
  filas.forEach(function (f, i) { f.posicion = i + 1; });

  const suma = function (k) { return filas.reduce(function (a, f) { return a + f[k]; }, 0); };
  const gastosGenerales = e.egresosSinCentro - bodega; // D-169: la compra de bodega ya está en egresos sin centro
  const sumaMargenes = suma('margen');
  const diferencia = e.utilidadTotal - (sumaMargenes - gastosGenerales);

  const totales = {
      ingreso_real: suma('ingreso_real'), ingreso_estimado: suma('ingreso_estimado'), ingreso_facturado: suma('ingreso_facturado'),
      costo_total: suma('costo_total'), suma_margenes: sumaMargenes, gastos_generales: gastosGenerales,
      clientes_en_perdida: filas.filter(function (f) { return f.en_perdida; }).length
  };

  return {
    filas: filas.concat([{
      tipo: 'GASTOS_GENERALES', posicion: null, cliente: 'Gastos generales',
      egresos_sin_centro: e.egresosSinCentro, consumo_bodega_reasignado: bodega, gastos_generales: gastosGenerales
    }]),
    totales: totales,
    utilidad_total: e.utilidadTotal,
    diferencia_conciliacion: diferencia,
    cuadra: diferencia === 0,
    estimacion: totales.ingreso_estimado > 0
  };
}

// Las vistas se cruzan con centro_costos/clientes para nombrar al cliente aunque el período del
// centro quede fuera del rango (sueldo pagado en un mes posterior).
const SQL_CENTRO = ' JOIN centro_costos cc ON cc.id = v.centro_costo_id LEFT JOIN clientes cl ON cl.id = cc.clienteId ';
const COLS_CENTRO = 'v.centro_costo_id, cc.clienteId AS cliente_id, cl.representante AS cliente, cc.numero_cc';

/**
 * Ranking de rentabilidad del rango.
 * @param {string} desde 'YYYY-MM'
 * @param {string} hasta 'YYYY-MM'
 * @returns {Promise<{data: object[], meta: object}>}
 */
async function rentabilidad(desde, hasta) {
  financiero.validarRango(desde, hasta);
  const r = { desde: desde, hasta: hasta };
  const filtro = ' WHERE v.periodo BETWEEN :desde AND :hasta';
  const [ingresos, costos, facturado, sinCentro, serie] = await Promise.all([
    consultar('SELECT ' + COLS_CENTRO + ', v.ingreso_real, v.ingreso_estimado FROM v_bi_rent_ingresos v' + SQL_CENTRO + filtro, r),
    consultar('SELECT ' + COLS_CENTRO + ', v.tipo, v.monto FROM v_bi_rent_costos v' + SQL_CENTRO + filtro, r),
    consultar('SELECT ' + COLS_CENTRO + ', v.ingreso_facturado FROM v_bi_rent_facturado v' + SQL_CENTRO + filtro, r),
    consultar('SELECT COALESCE(SUM(v.monto), 0) AS monto FROM v_bi_rent_egresos_sin_centro v' + filtro, r),
    financiero.tendencia(desde, hasta)
  ]);
  const res = armarRentabilidad({
    ingresos: ingresos, costos: costos, facturado: facturado,
    egresosSinCentro: aEnteroCLP(sinCentro[0].monto),
    utilidadTotal: serie.reduce(function (a, p) { return a + p.utilidad; }, 0)
  });
  return {
    data: res.filas,
    meta: {
      desde: desde, hasta: hasta, periodos: serie.length, totales: res.totales, utilidad_total: res.utilidad_total,
      diferencia_conciliacion: res.diferencia_conciliacion, cuadra: res.cuadra, estimacion: res.estimacion
    }
  };
}

/**
 * Desglose de un centro: sueldos / EPP e insumos / otros, total y por período de impacto en caja.
 * Rango por defecto: período del centro .. mes actual (tope 36 meses), porque los sueldos pueden pagarse después.
 * @param {number} centroCostoId
 * @param {string} [desde]
 * @param {string} [hasta]
 * @returns {Promise<{data: object, meta: object}>}
 */
async function detalle(centroCostoId, desde, hasta) {
  const centros = await consultar(
    'SELECT cc.id, cc.numero_cc, cc.estado, cc.clienteId AS cliente_id, cl.representante AS cliente, ca.periodo ' +
    'FROM centro_costos cc JOIN cajas ca ON ca.id = cc.cajaId LEFT JOIN clientes cl ON cl.id = cc.clienteId WHERE cc.id = :id',
    { id: centroCostoId });
  if (centros.length === 0) throw new AppError('CENTRO_NO_EXISTE', 'el centro de costo no existe', 404, { centroCostoId: centroCostoId });
  const centro = centros[0];

  const h = hasta === undefined ? financiero.mesActual() : hasta;
  let d = desde === undefined ? centro.periodo : desde;
  if (desde === undefined && financiero.periodoAIndice(h) - financiero.periodoAIndice(d) + 1 > MAX_MESES_RANGO) {
    d = financiero.indiceAPeriodo(financiero.periodoAIndice(h) - MAX_MESES_RANGO + 1);
  }
  financiero.validarRango(d, h);

  const r = { id: centroCostoId, desde: d, hasta: h };
  const filtro = ' WHERE v.centro_costo_id = :id AND v.periodo BETWEEN :desde AND :hasta';
  const [ingresos, costos, facturado] = await Promise.all([
    consultar('SELECT v.ingreso_real, v.ingreso_estimado FROM v_bi_rent_ingresos v' + filtro, r),
    consultar('SELECT v.periodo, v.tipo, v.monto FROM v_bi_rent_costos v' + filtro + ' ORDER BY v.periodo', r),
    consultar('SELECT v.ingreso_facturado FROM v_bi_rent_facturado v' + filtro, r)
  ]);

  const f = filaVacia(centro.cliente_id, centro.cliente);
  ingresos.forEach(function (i) { f.ingreso_real += aEnteroCLP(i.ingreso_real); f.ingreso_estimado += aEnteroCLP(i.ingreso_estimado); });
  facturado.forEach(function (i) { f.ingreso_facturado += aEnteroCLP(i.ingreso_facturado); });
  const porPeriodo = {};
  costos.forEach(function (c) {
    const col = COLUMNA_COSTO[c.tipo];
    if (!col) return;
    const monto = aEnteroCLP(c.monto);
    f[col] += monto;
    const p = porPeriodo[c.periodo] || (porPeriodo[c.periodo] = { periodo: c.periodo, sueldos: 0, epp_insumos: 0, otros: 0, otros_estimado: 0 });
    p[{ costo_sueldos: 'sueldos', costo_bodega: 'epp_insumos', costo_otros: 'otros', egreso_estimado: 'otros_estimado' }[col]] += monto;
  });
  calcularMargen(f);

  return {
    data: {
      centro: { id: centro.id, numero_cc: centro.numero_cc, cliente_id: centro.cliente_id, cliente: centro.cliente, periodo: centro.periodo, estado: centro.estado },
      ingreso: { real: f.ingreso_real, estimado: f.ingreso_estimado, facturado: f.ingreso_facturado, origen_ingreso: f.origen_ingreso },
      costos: { sueldos: f.costo_sueldos, epp_insumos: f.costo_bodega, otros: f.costo_otros, otros_estimado: f.egreso_estimado },
      costo_total: f.costo_total, margen: f.margen, margen_pct: f.margen_pct, margen_con_estimado: f.margen_con_estimado, en_perdida: f.en_perdida,
      por_periodo: Object.keys(porPeriodo).sort().map(function (k) { return porPeriodo[k]; })
    },
    meta: { desde: d, hasta: h }
  };
}

module.exports = { armarRentabilidad: armarRentabilidad, rentabilidad: rentabilidad, detalle: detalle };
