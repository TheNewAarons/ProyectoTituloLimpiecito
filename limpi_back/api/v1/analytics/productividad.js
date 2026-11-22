/**
 * RF-BI-04 — Capa HTTP de productividad PEV (Admin y Operaciones, gate en routes.js).
 */

const productividad = require('../../../services/analytics/productividad');

const responder = (fn) => async (req, res) => {
  const r = await fn(req.query);
  return res.json({ ok: true, data: r.data, meta: r.meta });
};

module.exports = {
  trabajadores: responder(productividad.trabajadores),
  supervisores: responder(productividad.supervisores),
  sectores: responder(productividad.sectores)
};
