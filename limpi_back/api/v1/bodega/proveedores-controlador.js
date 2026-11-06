/**
 * RF-BOD-03 — Capa HTTP de /api/v1/bodega/proveedores. Controlador delgado: la lógica vive en
 * services/bodega/proveedores.js.
 */

const AppError = require('../../../libs/app-error');
const proveedoresService = require('../../../services/bodega/proveedores');
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
    throw new AppError('PROVEEDOR_ID_INVALIDO', 'id de proveedor invalido', 400, { id: idTexto });
  }
  return id;
}

/** GET /api/v1/bodega/proveedores?pagina=&limite=&activo= */
const listar = async (req, res) => {
  const resultado = await proveedoresService.listar({
    pagina: req.query.pagina !== undefined ? Number(req.query.pagina) : undefined,
    limite: req.query.limite !== undefined ? Number(req.query.limite) : undefined,
    activo: req.query.activo !== undefined ? Number(req.query.activo) : undefined
  });
  return res.json({
    ok: true,
    data: resultado.filas,
    meta: { total: resultado.total, pagina: resultado.pagina, limite: resultado.limite }
  });
};

/** GET /api/v1/bodega/proveedores/:id */
const obtener = async (req, res) => {
  const proveedor = await proveedoresService.obtener(parsearId(req.params.id));
  return res.json({ ok: true, data: proveedor, meta: {} });
};

/** POST /api/v1/bodega/proveedores */
const crear = async (req, res) => {
  const proveedor = await proveedoresService.crear(req.body, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.status(201).json({ ok: true, data: proveedor, meta: {} });
};

/** PATCH /api/v1/bodega/proveedores/:id */
const editar = async (req, res) => {
  const proveedor = await proveedoresService.editar(parsearId(req.params.id), req.body, {
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: proveedor, meta: {} });
};

/** DELETE /api/v1/bodega/proveedores/:id — baja lógica (activo = 0) */
const desactivar = async (req, res) => {
  const proveedor = await proveedoresService.desactivar(parsearId(req.params.id), {
    usuario: usuarioDesdeRequest(req),
    ip: req.ip
  });
  return res.json({ ok: true, data: proveedor, meta: {} });
};

/** GET /api/v1/bodega/proveedores/:id/productos?pagina= */
const productos = async (req, res) => {
  const resultado = await proveedorProductoService.listarProductosDeProveedor(parsearId(req.params.id), {
    pagina: req.query.pagina !== undefined ? Number(req.query.pagina) : undefined
  });
  return res.json({
    ok: true,
    data: resultado.productos,
    meta: {
      total: resultado.total,
      pagina: resultado.pagina,
      cantidad_paginas: resultado.cantidad_paginas,
      cantidad_por_pagina: resultado.cantidad_por_pagina,
      next: resultado.next,
      prev: resultado.prev
    }
  });
};

module.exports = {
  listar: listar,
  obtener: obtener,
  crear: crear,
  editar: editar,
  desactivar: desactivar,
  productos: productos
};
