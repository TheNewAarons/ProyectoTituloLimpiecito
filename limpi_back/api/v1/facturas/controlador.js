/**
 * RF-FAC-01 — Capa HTTP (api/v1) de estado de pago de documentos (cc_ingresos / egresos). Solo
 * Admin. La lógica de la máquina de estados vive en services/facturas/pago.js.
 */

const db = require('../../../database/database');
const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const CcIngreso = require('../../../modelos/sistema_base/CcIngreso');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const CcEgreso = require('../../../modelos/sistema_base/CcEgreso');
const pagoService = require('../../../services/facturas/pago');

const ESTADOS_PAGO_VALIDOS = ['PENDIENTE', 'PAGADA', 'ANULADA'];

const CONFIG_INGRESOS = { modelo: CcIngreso, entidad: 'cc_ingresos', impactaCaja: false };
const CONFIG_EGRESOS = { modelo: Egreso, entidad: 'egresos', impactaCaja: true };

/**
 * @param {object} req
 * @returns {{id: number, contexto: string}}
 */
function usuarioDesdeRequest(req) {
  return { id: req.usuario.id, contexto: req.usuario.contexto };
}

/**
 * @param {string} idTexto
 * @returns {number}
 */
function parsearId(idTexto) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID_INVALIDO', 'id invalido', 400, { id: idTexto });
  }
  return id;
}

/**
 * @param {string|undefined} periodo
 */
function validarPeriodoQuery(periodo) {
  if (periodo !== undefined && !fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM', 400, { periodo: periodo });
  }
}

/**
 * @param {string|undefined} estadoPago
 */
function validarEstadoPagoQuery(estadoPago) {
  if (estadoPago !== undefined && ESTADOS_PAGO_VALIDOS.indexOf(estadoPago) === -1) {
    throw new AppError('ESTADO_PAGO_INVALIDO', 'estado_pago invalido', 400, { estado_pago: estadoPago, validos: ESTADOS_PAGO_VALIDOS });
  }
}

/**
 * Condición `DATE_FORMAT(columna, '%Y-%m') = periodo`.
 * @param {string} columna
 * @param {string} periodo
 */
function filtroPeriodo(columna, periodo) {
  return db.sequelize.where(db.sequelize.fn('DATE_FORMAT', db.sequelize.col(columna), '%Y-%m'), periodo);
}

/**
 * Construye el listado genérico de un modelo con filtros `estado_pago`/`periodo` (por
 * `fecha_emision` si existe, si no por `fecha`).
 * @param {object} modelo
 * @param {object} req
 */
async function listarGenerico(modelo, req) {
  const periodo = req.query.periodo;
  const estadoPago = req.query.estado_pago;
  validarPeriodoQuery(periodo);
  validarEstadoPagoQuery(estadoPago);

  const where = {};
  if (estadoPago) where.estado_pago = estadoPago;
  if (periodo) where.fecha_emision = filtroPeriodo('fecha_emision', periodo);

  const filas = await modelo.findAll({ where: where, order: [['id', 'DESC']] });
  return { filas: filas, periodo: periodo, estadoPago: estadoPago };
}

const listarIngresos = async (req, res) => {
  const r = await listarGenerico(CcIngreso, req);
  return res.json({ ok: true, data: r.filas, meta: { total: r.filas.length, periodo: r.periodo || null, estado_pago: r.estadoPago || null } });
};

const listarEgresos = async (req, res) => {
  const r = await listarGenerico(Egreso, req);
  return res.json({ ok: true, data: r.filas, meta: { total: r.filas.length, periodo: r.periodo || null, estado_pago: r.estadoPago || null } });
};

const pagarIngreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const fechaPago = req.body && req.body.fecha_pago ? req.body.fecha_pago : fecha.hoySantiago();
  const fila = await pagoService.pagar(CONFIG_INGRESOS, id, { fecha_pago: fechaPago, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

const anularIngreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && req.body.motivo;
  const fila = await pagoService.anular(CONFIG_INGRESOS, id, { motivo: motivo, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

const revertirIngreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && req.body.motivo;
  const fila = await pagoService.revertir(CONFIG_INGRESOS, id, { motivo: motivo, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

const pagarEgreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const fechaPago = req.body && req.body.fecha_pago ? req.body.fecha_pago : fecha.hoySantiago();
  const fila = await pagoService.pagar(CONFIG_EGRESOS, id, { fecha_pago: fechaPago, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

const anularEgreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && req.body.motivo;
  const fila = await pagoService.anular(CONFIG_EGRESOS, id, { motivo: motivo, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

const revertirEgreso = async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && req.body.motivo;
  const fila = await pagoService.revertir(CONFIG_EGRESOS, id, { motivo: motivo, usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: fila });
};

/**
 * GET /api/v1/facturas/resumen?periodo=YYYY-MM
 * Informativo, fuera del saldo de caja: por_cobrar = cc_ingresos PENDIENTE; por_pagar =
 * egresos (caja) + cc_egresos PENDIENTE.
 */
const resumen = async (req, res) => {
  const periodo = req.query.periodo;
  validarPeriodoQuery(periodo);

  const where = { estado_pago: 'PENDIENTE' };
  const whereConPeriodo = Object.assign({}, where, periodo ? { fecha_emision: filtroPeriodo('fecha_emision', periodo) } : {});

  const [ingresos, egresosCaja, egresosCc] = await Promise.all([
    CcIngreso.findAll({ where: whereConPeriodo, attributes: ['monto'] }),
    Egreso.findAll({ where: whereConPeriodo, attributes: ['monto'] }),
    CcEgreso.findAll({ where: whereConPeriodo, attributes: ['monto'] })
  ]);
  const sumar = function (filas) { return filas.reduce(function (acc, f) { return acc + Number(f.monto || 0); }, 0); };

  return res.json({
    ok: true,
    data: {
      por_cobrar: { cantidad: ingresos.length, monto_total: sumar(ingresos) },
      por_pagar: { cantidad: egresosCaja.length + egresosCc.length, monto_total: sumar(egresosCaja) + sumar(egresosCc) }
    },
    meta: { periodo: periodo || null }
  });
};

module.exports = {
  listarIngresos: listarIngresos,
  listarEgresos: listarEgresos,
  pagarIngreso: pagarIngreso,
  anularIngreso: anularIngreso,
  revertirIngreso: revertirIngreso,
  pagarEgreso: pagarEgreso,
  anularEgreso: anularEgreso,
  revertirEgreso: revertirEgreso,
  resumen: resumen
};
