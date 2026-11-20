/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — Capa HTTP de /api/v1/bodega/stock-rapido (Admin y Operaciones), equivalente de
 * /stock/obtener y /stock/crear. La lógica vive en services/bodega/stock-rapido.js.
 */

const { ctx } = require('./productos-crud-controlador');
// Carga diferida (ver productos-crud-controlador.js).
const servicio = () => require('../../../services/bodega/stock-rapido');

/** GET /stock-rapido */
const listar = async (req, res) => {
  const data = await servicio().listar();
  return res.json({ ok: true, data: data, meta: { total: data.length } });
};

/** POST /stock-rapido  body { items: [{ producto_id, cantidad, comentario?, fecha? }] } */
const crear = async (req, res) => {
  return res.status(201).json({ ok: true, data: await servicio().crear(req.body, ctx(req)), meta: {} });
};

module.exports = { listar: listar, crear: crear };
