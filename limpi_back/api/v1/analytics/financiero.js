/**
 * RF-BI-01 — Capa HTTP del dashboard financiero (solo Admin, gate en routes.js).
 */

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const financiero = require('../../../services/analytics/financiero');

const resumen = async (req, res) => {
  const periodo = req.query.periodo === undefined ? financiero.mesActual() : req.query.periodo;
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM', 400, { periodo: periodo });
  }
  return res.json({ ok: true, data: await financiero.resumen(periodo), meta: { periodo: periodo } });
};

const tendencia = async (req, res) => {
  const hasta = req.query.hasta === undefined ? financiero.mesActual() : req.query.hasta;
  // default: 12 meses terminando en `hasta`
  const desde = req.query.desde === undefined && fecha.esPeriodoValido(hasta)
    ? financiero.indiceAPeriodo(financiero.periodoAIndice(hasta) - 11)
    : req.query.desde;
  const data = await financiero.tendencia(desde, hasta);
  return res.json({ ok: true, data: data, meta: { desde: desde, hasta: hasta } });
};

const proyeccion = async (req, res) => res.json({ ok: true, data: await financiero.proyeccion(), meta: {} });

module.exports = { resumen: resumen, tendencia: tendencia, proyeccion: proyeccion };
