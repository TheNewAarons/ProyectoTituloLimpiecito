/**
 * RNF-ARQ-01 (cierre D-ARQ-01-1) — PATCH /api/v1/bodega/stock-rapido/:id/anular (Admin y Operaciones, como crear).
 * body { motivo }. La lógica vive en services/bodega/stock-rapido-anular.js.
 */

const AppError = require('../../../libs/app-error');
const { ctx } = require('./productos-crud-controlador');
// Carga diferida (ver productos-crud-controlador.js).
const servicio = () => require('../../../services/bodega/stock-rapido-anular');

const anular = async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'id de stock rápido inválido', 400, { id: req.params.id });
  }
  const data = await servicio().anular(id, req.body && req.body.motivo, ctx(req));
  return res.json({ ok: true, data: data, meta: {} });
};

module.exports = { anular: anular };
