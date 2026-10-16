/**
 * RF-CAJA-01 — Capa HTTP (api/v1) de cierre/reapertura/resumen/historial de caja por periodo.
 * La lógica vive en services/caja; aquí solo se valida la entrada y se da forma a la salida.
 */

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const cajaService = require('../../../services/caja');
const { CAJA_ABIERTA } = require('../../../services/constantes');

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 500;

/**
 * @param {object} req
 * @returns {{id: number, contexto: string}}
 */
function usuarioDesdeRequest(req) {
  return { id: req.usuario.id, contexto: req.usuario.contexto };
}

/**
 * @param {string} periodo
 * @returns {string}
 */
function validarPeriodo(periodo) {
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM', 400, { periodo: periodo });
  }
  return periodo;
}

/**
 * Forma pública de una caja (montos enteros CLP, estado como texto).
 * @param {object} caja instancia de `cajas`
 * @returns {object}
 */
function serializarCaja(caja) {
  const c = caja.get ? caja.get({ plain: true }) : caja;
  const entero = function (v) { return v === null || v === undefined ? null : Number(v); };
  return {
    id: c.id,
    periodo: c.periodo,
    estado: c.estado === CAJA_ABIERTA ? 'ABIERTA' : 'CERRADA',
    saldo_inicial: entero(c.saldo_inicial),
    saldo_final: entero(c.saldo_final),
    saldo_provisional: Boolean(c.saldo_provisional),
    total_ingreso: entero(c.total_ingreso),
    total_egreso: entero(c.total_egreso),
    utilidad: entero(c.utilidad),
    fecha_cierre: c.fecha_cierre || null,
    cerrada_por: c.cerrada_por === undefined ? null : c.cerrada_por
  };
}

async function resumen(req, res) {
  const periodo = validarPeriodo(req.params.periodo);
  const data = await cajaService.obtenerResumen(periodo);
  return res.json({ ok: true, data: data, meta: { calculado_en: new Date().toISOString() } });
}

async function cerrar(req, res) {
  const periodo = validarPeriodo(req.params.periodo);
  const r = await cajaService.cerrarMes(periodo, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({
    ok: true,
    data: {
      caja: serializarCaja(r.caja),
      siguiente: r.siguiente ? serializarCaja(r.siguiente) : null,
      recalculados: r.recalculados
    },
    meta: {}
  });
}

async function reabrir(req, res) {
  const periodo = validarPeriodo(req.params.periodo);
  const motivo = req.body && typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < MOTIVO_MIN || motivo.length > MOTIVO_MAX) {
    throw new AppError('MOTIVO_REQUERIDO', 'motivo obligatorio (entre ' + MOTIVO_MIN + ' y ' + MOTIVO_MAX + ' caracteres)', 400);
  }
  const r = await cajaService.reabrirMes(periodo, { usuario: usuarioDesdeRequest(req), motivo: motivo, ip: req.ip });
  return res.json({ ok: true, data: { caja: serializarCaja(r.caja) }, meta: {} });
}

async function historial(req, res) {
  const r = await cajaService.obtenerHistorial({ desde: req.query.desde, hasta: req.query.hasta });
  return res.json({ ok: true, data: r.items, meta: { desde: r.desde, hasta: r.hasta, total: r.items.length } });
}

module.exports = {
  resumen: resumen,
  cerrar: cerrar,
  reabrir: reabrir,
  historial: historial
};
