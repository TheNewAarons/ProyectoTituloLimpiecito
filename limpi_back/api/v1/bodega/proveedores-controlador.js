/**
 * RF-BOD-03 — Capa HTTP de /api/v1/bodega/proveedores. Controlador delgado: la lógica vive en
 * services/bodega/proveedores.js.
 */

const AppError = require('../../../libs/app-error');
const proveedoresService = require('../../../services/bodega/proveedores');
const proveedorProductoService = require('../../../services/bodega/proveedorProducto');
const codigoCorreo = require('../../../services/centro-costo/codigo-reapertura');
const Usuario = require('../../../modelos/sistema_base/Usuario');

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

/** GET /api/v1/bodega/proveedores?pagina=&limite=&activo=&buscar= */
const listar = async (req, res) => {
  const resultado = await proveedoresService.listar({
    pagina: req.query.pagina !== undefined ? Number(req.query.pagina) : undefined,
    limite: req.query.limite !== undefined ? Number(req.query.limite) : undefined,
    activo: req.query.activo !== undefined ? Number(req.query.activo) : undefined,
    buscar: req.query.buscar
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

/**
 * Activar/desactivar un proveedor en dos pasos, como reabrir un centro de costo:
 * POST /:id/estado/codigo { activo, motivo } envía un código al correo del usuario;
 * POST /:id/estado { activo, codigo } aplica el cambio (baja lógica, nunca se borra). El motivo auditado es el del correo.
 */
function leerActivo(req) {
  const activo = req.body && req.body.activo;
  if (activo !== 0 && activo !== 1) throw new AppError('CAMPO_INVALIDO', 'activo debe ser 0 o 1', 400, { campo: 'activo' });
  return activo;
}

// El estado destino va en la clave: un código pedido para desactivar no sirve para activar.
const claveCodigo = (id, activo) => 'prov:' + id + ':' + activo;

const pedirCodigoEstado = async (req, res) => {
  const id = parsearId(req.params.id);
  const activo = leerActivo(req);
  const motivo = req.body && typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < 5 || motivo.length > 500) {
    throw new AppError('MOTIVO_REQUERIDO', 'motivo obligatorio (entre 5 y 500 caracteres)', 400);
  }
  const proveedor = await proveedoresService.verificarCambioActivo(id, activo);
  const usuario = await Usuario.findById(req.usuario.id, { attributes: ['id', 'nombre', 'correo'] });
  const envio = await codigoCorreo.emitirCodigo(
    { id: req.usuario.id, nombre: usuario && usuario.nombre, correo: usuario && usuario.correo },
    { clave: claveCodigo(id, activo), descripcion: 'el proveedor ' + proveedor.nombre, accion: activo ? 'activar' : 'desactivar' },
    motivo
  );
  return res.json({ ok: true, data: envio, meta: {} });
};

const cambiarEstado = async (req, res) => {
  const id = parsearId(req.params.id);
  const activo = leerActivo(req);
  const motivo = codigoCorreo.consumirCodigo(req.usuario.id, claveCodigo(id, activo), req.body && req.body.codigo);
  const contexto = { usuario: usuarioDesdeRequest(req), ip: req.ip, motivo: motivo + ' [confirmado con código por correo]' };
  const proveedor = activo
    ? await proveedoresService.reactivar(id, contexto)
    : await proveedoresService.desactivar(id, contexto);
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
  pedirCodigoEstado: pedirCodigoEstado,
  cambiarEstado: cambiarEstado,
  productos: productos
};
