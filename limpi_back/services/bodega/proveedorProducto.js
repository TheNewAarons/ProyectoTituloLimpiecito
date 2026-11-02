/**
 * RF-BOD-03 — Asignación proveedor↔producto (migración 20261102151757: productos.proveedor_id).
 * Auditoría EDITAR sobre la entidad 'productos' (antes/despues solo con proveedor_id).
 */

const db = require('../../database/database');
const Producto = require('../../modelos/sistema_base/Producto');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const paginador = require('../paginado');

/**
 * @param {number} id
 * @param {object} [transaction]
 * @param {*} [lock]
 * @returns {Promise<object>} instancia Producto (lanza 404 si no existe)
 */
async function obtenerProductoOFallar(id, transaction, lock) {
  const opciones = { transaction: transaction };
  if (lock) opciones.lock = lock;
  const producto = await Producto.findById(id, opciones);
  if (!producto) {
    throw new AppError('PRODUCTO_NO_ENCONTRADO', 'no existe el producto ' + id, 404, { id: id });
  }
  return producto;
}

/**
 * @param {number} id
 * @returns {Promise<object>} instancia Proveedor activo (lanza 404/409)
 */
async function obtenerProveedorActivoOFallar(id, transaction) {
  const proveedor = await Proveedor.findById(id, { transaction: transaction });
  if (!proveedor) {
    throw new AppError('PROVEEDOR_NO_ENCONTRADO', 'no existe el proveedor ' + id, 404, { id: id });
  }
  if (proveedor.activo !== 1) {
    throw new AppError('PROVEEDOR_INACTIVO', 'el proveedor esta inactivo', 409, { id: id });
  }
  return proveedor;
}

/**
 * PATCH /productos/:id/proveedor — asigna o desasigna (proveedor_id: null) el proveedor de un producto.
 * @param {number} productoId
 * @param {number|null} proveedorId
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 */
async function asignarProveedor(productoId, proveedorId, contexto) {
  if (proveedorId !== null && (!Number.isInteger(proveedorId) || proveedorId <= 0)) {
    throw new AppError('PROVEEDOR_ID_INVALIDO', 'proveedor_id debe ser un entero positivo o null', 400, { proveedor_id: proveedorId });
  }

  return db.sequelize.transaction(async function (t) {
    const producto = await obtenerProductoOFallar(productoId, t, t.LOCK.UPDATE);
    if (producto.proveedor_id === proveedorId) {
      return producto;
    }
    if (proveedorId !== null) {
      await obtenerProveedorActivoOFallar(proveedorId, t);
    }

    const antes = { proveedor_id: producto.proveedor_id };
    await producto.update({ proveedor_id: proveedorId }, { transaction: t });

    await auditar({
      transaction: t,
      usuario: contexto.usuario,
      entidad: 'productos',
      entidad_id: producto.id,
      accion: 'EDITAR',
      antes: antes,
      despues: { proveedor_id: producto.proveedor_id },
      ip: contexto.ip
    });
    return producto;
  });
}

/**
 * GET /proveedores/:id/productos — lista paginada de productos asignados al proveedor.
 * @param {number} proveedorId
 * @param {{pagina?: number}} opciones
 */
async function listarProductosDeProveedor(proveedorId, opciones) {
  await obtenerProveedorPorId(proveedorId);
  const o = opciones || {};
  const pagina = Number.isInteger(o.pagina) && o.pagina > 0 ? o.pagina : 1;

  const totalCount = await Producto.count({ where: { proveedor_id: proveedorId } });
  const porPagina = parseInt(process.env.CANTIDAD_ITEM_PAGINA, 10) || 10;
  const totalPage = Math.max(Math.ceil(totalCount / porPagina), 1);
  const paginado = await paginador.paginador(pagina, totalPage);

  const productos = await Producto.findAll({
    where: { proveedor_id: proveedorId },
    offset: paginado.skip,
    limit: porPagina,
    order: [['nombre', 'ASC']]
  });

  return {
    productos: productos,
    total: totalCount,
    pagina: pagina,
    cantidad_paginas: totalPage,
    cantidad_por_pagina: paginado.cantidad_por_pagina,
    next: paginado.next,
    prev: paginado.prev
  };
}

/**
 * @param {number} id
 * @returns {Promise<object>} instancia Proveedor (lanza 404 si no existe; no exige activo)
 */
async function obtenerProveedorPorId(id) {
  const proveedor = await Proveedor.findById(id);
  if (!proveedor) {
    throw new AppError('PROVEEDOR_NO_ENCONTRADO', 'no existe el proveedor ' + id, 404, { id: id });
  }
  return proveedor;
}

module.exports = {
  asignarProveedor: asignarProveedor,
  listarProductosDeProveedor: listarProductosDeProveedor
};
