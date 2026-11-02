/**
 * RF-BOD-03 — Capa HTTP de /api/v1/bodega/ordenes-compra. Controlador delgado: la lógica vive en
 * services/bodega/ordenesCompra.js.
 */

const AppError = require('../../../libs/app-error');
const ordenesCompraService = require('../../../services/bodega/ordenesCompra');

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
    throw new AppError('ORDEN_ID_INVALIDO', 'id de orden de compra invalido', 400, { id: idTexto });
  }
  return id;
}

/** GET /api/v1/bodega/ordenes-compra/:id */
const obtener = async (req, res) => {
  const orden = await ordenesCompraService.obtener(parsearId(req.params.id));
  return res.json({ ok: true, data: orden, meta: {} });
};

/** PATCH /api/v1/bodega/ordenes-compra/:id { items?, eliminar? } */
const actualizar = async (req, res) => {
  const orden = await ordenesCompraService.actualizar(parsearId(req.params.id), req.body, {
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: orden, meta: {} });
};

/** POST /api/v1/bodega/ordenes-compra/:id/enviar */
const enviar = async (req, res) => {
  const orden = await ordenesCompraService.enviar(parsearId(req.params.id), {
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: orden, meta: {} });
};

module.exports = {
  obtener: obtener,
  actualizar: actualizar,
  enviar: enviar
};
