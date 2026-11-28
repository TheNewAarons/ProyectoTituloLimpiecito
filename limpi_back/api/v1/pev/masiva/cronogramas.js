/**
 * GET /api/v1/pev/asignaciones-masivas/cronogramas?cliente_id=&turno_id= — cronogramas vigentes para elegir "Desde".
 */
const regla = require('../../../../services/pev/asignacion-cronograma-regla');

module.exports = async (req, res) => {
  const lista = await regla.vigentes(req.query.cliente_id, req.query.turno_id);
  res.json({ ok: true, data: lista, meta: { total: lista.length } });
};
