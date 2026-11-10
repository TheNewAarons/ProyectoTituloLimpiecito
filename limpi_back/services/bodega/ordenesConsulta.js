/**
 * RF-BOD-04 — Consultas de órdenes de compra para la pantalla de recepción (solo lectura).
 * GET /ordenes-compra (listado con avance) y GET /ordenes-compra/:id/recepcion (líneas con nombre y pendiente).
 * El GET /ordenes-compra/:id de RF-BOD-03 no trae nombres de producto ni pendientes.
 */

const Op = require('sequelize').Op;

const AppError = require('../../libs/app-error');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../modelos/sistema_bodega/Orden_compra_item');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const Producto = require('../../modelos/sistema_base/Producto');

const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const pendiente = (l) => Math.max(Number(l.cantidad) - Number(l.cantidad_recibida || 0), 0);

/**
 * @param {{estados?: string[], page:number, limit:number}} filtros
 */
async function listar(filtros) {
  const where = filtros.estados ? { estado: { [Op.in]: filtros.estados } } : {};
  const r = await Orden_compra.findAndCountAll({ where: where, order: [['id', 'DESC']], limit: filtros.limit, offset: (filtros.page - 1) * filtros.limit });
  const ids = r.rows.map((o) => o.id);
  const lineas = ids.length ? await Orden_compra_item.findAll({ where: { orden_id: { [Op.in]: ids } }, attributes: ['orden_id', 'cantidad', 'cantidad_recibida'] }) : [];
  const proveedores = porId(await Proveedor.findAll({ where: { id: { [Op.in]: Array.from(new Set(r.rows.map((o) => o.proveedor_id))) } }, attributes: ['id', 'nombre'] }));
  return {
    data: r.rows.map((o) => {
      const propias = lineas.filter((l) => l.orden_id === o.id);
      return {
        id: o.id, estado: o.estado, proveedor: proveedores[o.proveedor_id] ? proveedores[o.proveedor_id].nombre : null,
        enviada_at: o.enviada_at, created_at: o.created_at, lineas: propias.length,
        unidades_pedidas: propias.reduce((a, l) => a + Number(l.cantidad), 0),
        unidades_pendientes: propias.reduce((a, l) => a + pendiente(l), 0)
      };
    }),
    meta: { page: filtros.page, limit: filtros.limit, total: r.count }
  };
}

/** @param {number} id */
async function detalleRecepcion(id) {
  const orden = await Orden_compra.findById(id);
  if (!orden) throw new AppError('ORDEN_NO_ENCONTRADA', 'no existe la orden de compra ' + id, 404, { id: id });
  const lineas = await Orden_compra_item.findAll({ where: { orden_id: id }, order: [['id', 'ASC']] });
  const productos = porId(await Producto.findAll({ where: { id: { [Op.in]: lineas.map((l) => l.producto_id) } }, attributes: ['id', 'nombre'] }));
  const proveedor = await Proveedor.findById(orden.proveedor_id, { attributes: ['id', 'nombre'] });
  return {
    id: orden.id, estado: orden.estado, proveedor: proveedor ? proveedor.nombre : null, enviada_at: orden.enviada_at,
    recibible: orden.estado === 'ENVIADA' || orden.estado === 'RECIBIDA_PARCIAL',
    items: lineas.map((l) => ({
      item_id: l.id, producto_id: l.producto_id, producto: productos[l.producto_id] ? productos[l.producto_id].nombre : null,
      cantidad: Number(l.cantidad), cantidad_recibida: Number(l.cantidad_recibida || 0), pendiente: pendiente(l),
      costo_unitario: l.costo_unitario === null || l.costo_unitario === undefined ? null : Number(l.costo_unitario)
    }))
  };
}

module.exports = { listar, detalleRecepcion };
