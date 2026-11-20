/**
 * RF-BI-02 — Capa HTTP de rentabilidad por cliente / centro de costo (solo Admin, gate en routes.js).
 */

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const financiero = require('../../../services/analytics/financiero');
const rentabilidad = require('../../../services/analytics/rentabilidad');

function periodoOpcional(valor, nombre) {
  if (valor !== undefined && !fecha.esPeriodoValido(valor)) {
    throw new AppError('PERIODO_INVALIDO', nombre + ' invalido, formato esperado YYYY-MM', 400, { [nombre]: valor });
  }
  return valor;
}

const listar = async (req, res) => {
  const hasta = periodoOpcional(req.query.hasta, 'hasta') || financiero.mesActual();
  // default: 3 meses terminando en `hasta`
  const desde = periodoOpcional(req.query.desde, 'desde') || financiero.indiceAPeriodo(financiero.periodoAIndice(hasta) - 2);
  const r = await rentabilidad.rentabilidad(desde, hasta);
  return res.json({ ok: true, data: r.data, meta: r.meta });
};

const detalle = async (req, res) => {
  const id = Number(req.params.centroCostoId);
  if (!/^\d+$/.test(req.params.centroCostoId) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'centroCostoId debe ser un entero mayor a 0', 400, { centroCostoId: req.params.centroCostoId });
  }
  const r = await rentabilidad.detalle(id, periodoOpcional(req.query.desde, 'desde'), periodoOpcional(req.query.hasta, 'hasta'));
  return res.json({ ok: true, data: r.data, meta: r.meta });
};

module.exports = { listar: listar, detalle: detalle };
