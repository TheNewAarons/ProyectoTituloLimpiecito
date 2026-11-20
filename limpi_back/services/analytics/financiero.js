/**
 * RF-BI-01 — Dashboard financiero. Mes de un movimiento = cajas.periodo (vista v_bi_caja_mensual).
 * Mes cerrado: utilidad_caja (saldo_final - saldo_inicial); mes abierto: calcularSaldo (ingresos - egresos).
 * Las funciones de proyeccion son puras (sin BD).
 */

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const Configuracion = require('../../modelos/sistema_base/Configuracion');
const { calcularSaldo, aEnteroCLP } = require('../caja/saldo');
const { resumenPendientes } = require('../facturas/pendientes');
const { CAJA_ABIERTA, CAJA_CERRADA } = require('../constantes');

const CLAVE_UMBRAL = 'bi.umbral_utilidad_baja';
const MIN_HISTORIA = 3;
const VENTANA_REGRESION = 6;
const MAX_MESES_RANGO = 36;

/** @param {string} periodo 'YYYY-MM' @returns {number} indice de mes calendario */
function periodoAIndice(periodo) {
  return Number(periodo.slice(0, 4)) * 12 + Number(periodo.slice(5, 7)) - 1;
}

/** @param {number} indice @returns {string} 'YYYY-MM' */
function indiceAPeriodo(indice) {
  const mes = (indice % 12) + 1;
  return Math.floor(indice / 12) + '-' + (mes < 10 ? '0' + mes : mes);
}

/** @returns {string} mes actual 'YYYY-MM' en America/Santiago */
function mesActual() {
  return fecha.hoySantiago().slice(0, 7);
}

/**
 * Lista de periodos desde..hasta (inclusive).
 * @param {string} desde
 * @param {string} hasta
 * @returns {string[]}
 */
function rangoPeriodos(desde, hasta) {
  const r = [];
  for (let i = periodoAIndice(desde); i <= periodoAIndice(hasta); i++) r.push(indiceAPeriodo(i));
  return r;
}

/**
 * Valida desde/hasta (YYYY-MM, desde <= hasta, max 36 meses).
 * @param {string} desde
 * @param {string} hasta
 */
function validarRango(desde, hasta) {
  [['desde', desde], ['hasta', hasta]].forEach(function (p) {
    if (!fecha.esPeriodoValido(p[1])) {
      throw new AppError('PERIODO_INVALIDO', p[0] + ' invalido, formato esperado YYYY-MM', 400, { [p[0]]: p[1] });
    }
  });
  if (periodoAIndice(desde) > periodoAIndice(hasta)) {
    throw new AppError('RANGO_INVALIDO', 'desde no puede ser posterior a hasta', 400, { desde: desde, hasta: hasta });
  }
  if (periodoAIndice(hasta) - periodoAIndice(desde) + 1 > MAX_MESES_RANGO) {
    throw new AppError('RANGO_INVALIDO', 'el rango maximo es de ' + MAX_MESES_RANGO + ' meses', 400, { desde: desde, hasta: hasta });
  }
}

/**
 * Promedio movil de las ultimas 3 filas (ingresos y egresos por separado).
 * @param {Array<{ingresos: number, egresos: number}>} historia ordenada ascendente
 * @returns {{ingresos: number, egresos: number, utilidad: number}}
 */
function promedioMovil(historia) {
  const u = historia.slice(-MIN_HISTORIA);
  const prom = function (k) { return Math.round(u.reduce(function (a, f) { return a + f[k]; }, 0) / u.length); };
  const ingresos = prom('ingresos');
  const egresos = prom('egresos');
  return { ingresos: ingresos, egresos: egresos, utilidad: ingresos - egresos };
}

/**
 * Minimos cuadrados simple; devuelve el valor predicho en xPred.
 * @param {number[]} xs
 * @param {number[]} ys
 * @param {number} xPred
 * @returns {number}
 */
function predecirLineal(xs, ys, xPred) {
  const n = xs.length;
  const mx = xs.reduce(function (a, v) { return a + v; }, 0) / n;
  const my = ys.reduce(function (a, v) { return a + v; }, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
  }
  const pendiente = sxx === 0 ? 0 : sxy / sxx;
  return my + pendiente * (xPred - mx);
}

/**
 * Regresion lineal sobre las ultimas 6 filas; x = indice de mes calendario (tolera huecos).
 * @param {Array<{periodo: string, ingresos: number, egresos: number}>} historia ordenada ascendente (>= 6)
 * @param {string} periodoPrediccion 'YYYY-MM'
 * @returns {{periodo: string, ingresos: number, egresos: number, utilidad: number}}
 */
function regresionLineal(historia, periodoPrediccion) {
  const u = historia.slice(-VENTANA_REGRESION);
  const xs = u.map(function (f) { return periodoAIndice(f.periodo); });
  const x = periodoAIndice(periodoPrediccion);
  const ingresos = Math.round(predecirLineal(xs, u.map(function (f) { return f.ingresos; }), x));
  const egresos = Math.round(predecirLineal(xs, u.map(function (f) { return f.egresos; }), x));
  return { periodo: periodoPrediccion, ingresos: ingresos, egresos: egresos, utilidad: ingresos - egresos };
}

/**
 * @param {Array<{periodo: string, ingresos: number, egresos: number}>} historia cajas cerradas previas al mes actual, ascendente
 * @param {string} actual mes actual 'YYYY-MM'
 * @returns {object} proyeccion (siempre estimacion: true)
 */
function calcularProyeccion(historia, actual) {
  if (historia.length < MIN_HISTORIA) {
    return { insuficiente: true, mensaje: 'Datos insuficientes', meses_historia: historia.length, promedio_movil: null, regresion: null, estimacion: true };
  }
  return {
    insuficiente: false,
    meses_historia: historia.length,
    promedio_movil: promedioMovil(historia),
    regresion: historia.length >= VENTANA_REGRESION ? regresionLineal(historia, indiceAPeriodo(periodoAIndice(actual) + 1)) : null,
    estimacion: true
  };
}

/**
 * Alerta: utilidad real del mes < umbral OR utilidad proyectada (promedio movil) < umbral.
 * @param {number} utilidadReal
 * @param {object} proyeccion
 * @param {number} umbral
 * @returns {{activa: boolean, umbral: number, motivo: string|null}}
 */
function evaluarAlerta(utilidadReal, proyeccion, umbral) {
  let motivo = null;
  if (utilidadReal < umbral) motivo = 'UTILIDAD_REAL_BAJA';
  else if (!proyeccion.insuficiente && proyeccion.promedio_movil.utilidad < umbral) motivo = 'UTILIDAD_PROYECTADA_BAJA';
  return { activa: motivo !== null, umbral: umbral, motivo: motivo };
}

/** @returns {Promise<number>} umbral configurado (CLP entero, 0 si falta o es invalido) */
async function obtenerUmbral() {
  const fila = await Configuracion.findOne({ where: { clave: CLAVE_UMBRAL } });
  const n = fila ? parseInt(fila.valor, 10) : 0;
  return isNaN(n) ? 0 : n;
}

/**
 * Filas de la vista (una por caja) en el rango.
 * @param {string} desde
 * @param {string} hasta
 * @returns {Promise<object[]>}
 */
function filasVista(desde, hasta) {
  return db.sequelize.query(
    'SELECT periodo, estado, total_ingreso, total_egreso, utilidad_caja FROM v_bi_caja_mensual ' +
    'WHERE periodo BETWEEN :desde AND :hasta ORDER BY periodo',
    { replacements: { desde: desde, hasta: hasta }, type: db.sequelize.QueryTypes.SELECT }
  );
}

/**
 * Serie mensual desde..hasta; meses sin caja = 0.
 * @param {string} desde
 * @param {string} hasta
 * @returns {Promise<Array<{periodo: string, ingresos: number, egresos: number, utilidad: number}>>}
 */
async function tendencia(desde, hasta) {
  validarRango(desde, hasta);
  const filas = await filasVista(desde, hasta);
  const porPeriodo = {};
  for (const f of filas) {
    if (f.estado === CAJA_ABIERTA) {
      const s = await calcularSaldo(f.periodo);
      porPeriodo[f.periodo] = { ingresos: s.ingresos, egresos: s.egresos.total, utilidad: s.ingresos - s.egresos.total };
    } else {
      const ingresos = aEnteroCLP(f.total_ingreso);
      const egresos = aEnteroCLP(f.total_egreso);
      porPeriodo[f.periodo] = { ingresos: ingresos, egresos: egresos, utilidad: f.utilidad_caja === null ? ingresos - egresos : aEnteroCLP(f.utilidad_caja) };
    }
  }
  return rangoPeriodos(desde, hasta).map(function (p) {
    return Object.assign({ periodo: p }, porPeriodo[p] || { ingresos: 0, egresos: 0, utilidad: 0 });
  });
}

/**
 * Proyeccion a partir de las ultimas 6 cajas cerradas con periodo < mes actual.
 * @returns {Promise<object>}
 */
async function proyeccion() {
  const actual = mesActual();
  const filas = await db.sequelize.query(
    'SELECT periodo, total_ingreso, total_egreso FROM v_bi_caja_mensual ' +
    'WHERE estado = :cerrada AND periodo < :actual ORDER BY periodo DESC LIMIT ' + VENTANA_REGRESION,
    { replacements: { cerrada: CAJA_CERRADA, actual: actual }, type: db.sequelize.QueryTypes.SELECT }
  );
  const historia = filas.reverse().map(function (f) {
    return { periodo: f.periodo, ingresos: aEnteroCLP(f.total_ingreso), egresos: aEnteroCLP(f.total_egreso) };
  });
  return calcularProyeccion(historia, actual);
}

/**
 * Payload de carga inicial del dashboard.
 * @param {string} periodo 'YYYY-MM'
 * @returns {Promise<object>}
 */
async function resumen(periodo) {
  let s = null;
  try {
    s = await calcularSaldo(periodo);
  } catch (e) {
    if (!(e instanceof AppError) || e.code !== 'CAJA_NO_EXISTE') throw e;
  }
  const [proy, umbral, pend] = await Promise.all([proyeccion(), obtenerUmbral(), resumenPendientes()]);

  const cerrada = s ? s.estado === CAJA_CERRADA : null;
  const ingresos = s ? s.ingresos : 0;
  const egresos = s ? s.egresos.total : 0;
  const utilidad = s ? (cerrada && s.saldo_final !== null ? s.saldo_final - s.saldo_inicial : ingresos - egresos) : 0;

  return {
    periodo: periodo,
    utilidad_real: { ingresos: ingresos, egresos: egresos, utilidad: utilidad, cerrada: cerrada },
    saldo_acumulado: { saldo: s && s.saldo_final !== null ? s.saldo_final : 0, provisional: s ? s.provisional : false },
    proyeccion: proy,
    alerta_utilidad: evaluarAlerta(utilidad, proy, umbral),
    liquidaciones_pendientes: s ? s.pendientes : { cantidad: 0, monto: 0 },
    por_cobrar: { cantidad: pend.por_cobrar.cantidad, monto: pend.por_cobrar.monto_total, nota: 'Informativo: no afecta la utilidad' },
    por_pagar: { cantidad: pend.por_pagar.cantidad, monto: pend.por_pagar.monto_total }
  };
}

module.exports = {
  mesActual: mesActual,
  indiceAPeriodo: indiceAPeriodo,
  periodoAIndice: periodoAIndice,
  rangoPeriodos: rangoPeriodos,
  validarRango: validarRango,
  promedioMovil: promedioMovil,
  regresionLineal: regresionLineal,
  calcularProyeccion: calcularProyeccion,
  evaluarAlerta: evaluarAlerta,
  tendencia: tendencia,
  proyeccion: proyeccion,
  resumen: resumen
};
