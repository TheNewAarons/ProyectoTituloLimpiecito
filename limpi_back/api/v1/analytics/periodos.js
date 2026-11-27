/**
 * Primer mes con datos por dashboard (límite inferior del filtro de fechas).
 */

const periodos = require('../../../services/analytics/periodos');

const listar = async (req, res) => res.json({ ok: true, data: await periodos.primerosPeriodos(), meta: {} });

module.exports = { listar: listar };
