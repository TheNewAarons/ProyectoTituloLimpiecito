/**
 * RF-BOD-03 — Capa HTTP de /api/v1/bodega/productos. Controlador delgado: la lógica vive en
 * services/bodega/proveedorProducto.js.
 */

const AppError = require('../../../libs/app-error');
const proveedorProductoService = require('../../../services/bodega/proveedorProducto');

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
    throw new AppError('PRODUCTO_ID_INVALIDO', 'id de producto invalido', 400, { id: idTexto });
  }
  return id;
}

/** PATCH /api/v1/bodega/productos/:id/proveedor { proveedor_id: <int>|null } */
const asignarProveedor = async (req, res) => {
  const body = req.body || {};
  if (!Object.prototype.hasOwnProperty.call(body, 'proveedor_id')) {
    throw new AppError('CAMPO_INVALIDO', 'proveedor_id es requerido (usar null para desasignar)', 400, { campo: 'proveedor_id' });
  }
  if (body.proveedor_id !== null && !Number.isInteger(body.proveedor_id)) {
    throw new AppError('PROVEEDOR_ID_INVALIDO', 'proveedor_id debe ser un entero o null', 400, { proveedor_id: body.proveedor_id });
  }
  const producto = await proveedorProductoService.asignarProveedor(parsearId(req.params.id), body.proveedor_id, {
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: producto, meta: {} });
};

module.exports = {
  asignarProveedor: asignarProveedor
};
