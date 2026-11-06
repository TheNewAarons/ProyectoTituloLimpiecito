/**
 * RF-BOD-02 — Capa HTTP del cruce de stock y la lista de compra (/api/v1/bodega). Controlador
 * delgado: la lógica vive en services/bodega/cruceStock.js.
 */

const AppError = require('../../../libs/app-error');
const cruceStock = require('../../../services/bodega/cruceStock');

/**
 * @param {string} idTexto
 * @returns {number}
 */
function parsearId(idTexto) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('SOLICITUD_ID_INVALIDO', 'id de solicitud invalido', 400, { id: idTexto });
  }
  return id;
}

/**
 * @param {object} req
 * @returns {{id: number, contexto: string}}
 */
function usuarioDesdeRequest(req) {
  return { id: req.usuario.id, contexto: req.usuario.contexto };
}

/** GET /api/v1/bodega/solicitudes/:id/cruce */
const obtenerCruce = async (req, res) => {
  const data = await cruceStock.obtenerCruce(parsearId(req.params.id));
  return res.json({ ok: true, data: data, meta: {} });
};

/** GET /api/v1/bodega/lista-compra?agrupar=proveedor */
const listaCompra = async (req, res) => {
  const crudo = req.query.agrupar;
  if (crudo !== undefined && crudo !== 'proveedor') {
    throw new AppError('CAMPO_INVALIDO', 'agrupar solo admite "proveedor"', 400, { agrupar: crudo });
  }
  const agrupar = crudo === 'proveedor' ? 'proveedor' : null;
  const data = await cruceStock.listaCompra({ agrupar: agrupar });
  return res.json({ ok: true, data: data, meta: { agrupar: agrupar } });
};

/** POST /api/v1/bodega/ordenes-compra/desde-lista */
const generarDesdeLista = async (req, res) => {
  const data = await cruceStock.generarDesdeLista({ usuario: usuarioDesdeRequest(req), ip: req.ip });
  const creadas = Array.isArray(data.creadas) ? data.creadas.length : 0;
  return res.status(creadas > 0 ? 201 : 200).json({ ok: true, data: data, meta: {} });
};

module.exports = {
  obtenerCruce: obtenerCruce,
  listaCompra: listaCompra,
  generarDesdeLista: generarDesdeLista
};
