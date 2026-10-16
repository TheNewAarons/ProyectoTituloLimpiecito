/**
 * RF-CAJA-02 — Capa HTTP (api/v1) del flujo de pago de liquidaciones (TASK_PLAN §2/§7).
 * No modifica controlador.js/logica.js/routes.js (legacy, montado en /liquidacion).
 * La lógica de negocio (máquina de estados, transacciones, auditoría) vive en
 * services/liquidaciones/pago.js; este archivo solo valida la entrada HTTP y da forma a la salida.
 */

const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const db = require('../../../database/database');
const pagoService = require('../../../services/liquidaciones/pago');

const ESTADOS_PAGO_VALIDOS = ['EN_ESPERA', 'PAGADA', 'ANULADA'];
const LIQUIDACION_CERRADA = 0;

/**
 * @param {object} req
 * @returns {{id: number, contexto: string}}
 */
function usuarioDesdeRequest(req) {
  return { id: req.usuario.id, contexto: req.usuario.contexto };
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
    throw new AppError('ESTADO_PAGO_INVALIDO', 'estado_pago invalido', 400, {
      estado_pago: estadoPago,
      validos: ESTADOS_PAGO_VALIDOS
    });
  }
}

/**
 * @param {string} idTexto
 * @returns {number}
 */
function parsearId(idTexto) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('LIQUIDACION_ID_INVALIDO', 'id de liquidacion invalido', 400, { id: idTexto });
  }
  return id;
}

/**
 * Condición `DATE_FORMAT(columna, '%Y-%m') = periodo`, válida tanto para columnas DATE
 * (fecha_creacion) como DATEONLY (fecha_pago).
 * @param {string} columna
 * @param {string} periodo 'YYYY-MM'
 */
function filtroPeriodo(columna, periodo) {
  return db.sequelize.where(db.sequelize.fn('DATE_FORMAT', db.sequelize.col(columna), '%Y-%m'), periodo);
}

/**
 * GET /api/v1/liquidaciones?periodo=YYYY-MM&estado_pago=EN_ESPERA|PAGADA|ANULADA
 *
 * Decisión (TASK_PLAN): si el filtro de estado es PAGADA, `periodo` filtra por `fecha_pago`
 * (la fecha real del egreso/caja afectada); en cualquier otro caso (sin filtro de estado, o
 * EN_ESPERA/ANULADA) filtra por `fecha_creacion`, porque solo las liquidaciones PAGADAS tienen
 * una fecha_pago definida.
 */
const listar = async (req, res) => {
  const periodo = req.query.periodo;
  const estadoPago = req.query.estado_pago;
  validarPeriodoQuery(periodo);
  validarEstadoPagoQuery(estadoPago);

  const where = {};
  if (estadoPago) where.estado_pago = estadoPago;
  if (periodo) {
    const columna = estadoPago === 'PAGADA' ? 'fecha_pago' : 'fecha_creacion';
    where[columna] = filtroPeriodo(columna, periodo);
  }

  const liquidaciones = await Liquidacion.findAll({ where: where, order: [['id', 'ASC']] });
  return res.json({
    ok: true,
    data: liquidaciones,
    meta: { total: liquidaciones.length, periodo: periodo || null, estado_pago: estadoPago || null }
  });
};

/**
 * GET /api/v1/liquidaciones/pendientes-resumen?periodo=YYYY-MM
 * Resumen informativo (cantidad y monto) de liquidaciones cerradas EN_ESPERA de pago; no se suma
 * al saldo de caja (ver services/caja/saldo.js).
 */
const pendientesResumen = async (req, res) => {
  const periodo = req.query.periodo;
  validarPeriodoQuery(periodo);

  const where = { estado_pago: 'EN_ESPERA', estado: LIQUIDACION_CERRADA };
  if (periodo) where.fecha_creacion = filtroPeriodo('fecha_creacion', periodo);

  const filas = await Liquidacion.findAll({
    where: where,
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'cantidad'],
      [db.sequelize.fn('SUM', db.sequelize.col('liquido_pagar')), 'monto_total']
    ],
    raw: true
  });
  const fila = filas[0] || {};
  return res.json({
    ok: true,
    data: {
      cantidad: Number(fila.cantidad) || 0,
      monto_total: Number(fila.monto_total) || 0,
      periodo: periodo || null
    }
  });
};

/**
 * PATCH /api/v1/liquidaciones/:id/pagar { fecha_pago? }
 * Si falta `fecha_pago`, se usa el día de hoy en America/Santiago.
 */
const pagar = async (req, res) => {
  const id = parsearId(req.params.id);
  const fechaPago = req.body && req.body.fecha_pago ? req.body.fecha_pago : fecha.hoySantiago();

  const resultado = await pagoService.pagar(id, {
    fecha_pago: fechaPago,
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: resultado });
};

/**
 * POST /api/v1/liquidaciones/pagar-lote { ids: number[], fecha_pago? }
 * Atómico (todo o nada): ver services/liquidaciones/pago.js#pagarLote.
 */
const pagarLote = async (req, res) => {
  const ids = req.body && req.body.ids;
  if (!Array.isArray(ids)) {
    throw new AppError('LOTE_INVALIDO', 'ids debe ser un arreglo de enteros', 400);
  }
  const fechaPago = req.body && req.body.fecha_pago ? req.body.fecha_pago : fecha.hoySantiago();

  const resultado = await pagoService.pagarLote(ids, {
    fecha_pago: fechaPago,
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: resultado });
};

/**
 * PATCH /api/v1/liquidaciones/:id/revertir-pago { motivo }
 * Solo Admin (matriz de permisos spec §2.3). Si la caja del pago está cerrada, el servicio
 * responde 409 MES_CERRADO (hay que reabrir el mes antes de revertir).
 */
const revertirPago = async (req, res) => {
  const id = parsearId(req.params.id);
  const motivo = req.body && req.body.motivo;

  const resultado = await pagoService.revertirPago(id, {
    motivo: motivo,
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: resultado });
};

module.exports = {
  listar: listar,
  pendientesResumen: pendientesResumen,
  pagar: pagar,
  pagarLote: pagarLote,
  revertirPago: revertirPago
};
