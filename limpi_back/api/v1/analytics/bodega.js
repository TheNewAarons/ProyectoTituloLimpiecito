/**
 * RF-BI-03 — Capa HTTP del análisis de consumo de bodega (Admin y Operaciones, gate en routes.js).
 */

const bodega = require('../../../services/analytics/bodega');

const responder = (fn) => async (req, res) => {
  const r = await fn(req.query);
  return res.json({ ok: true, data: r.data, meta: r.meta });
};

module.exports = {
  topProductos: responder(bodega.topProductos),
  consumo: responder(bodega.consumo),
  frecuenciaCompra: responder(bodega.frecuenciaCompra),
  stockCritico: responder(bodega.stockCritico),
  merma: responder(bodega.merma) // RF-BOD-04
};
