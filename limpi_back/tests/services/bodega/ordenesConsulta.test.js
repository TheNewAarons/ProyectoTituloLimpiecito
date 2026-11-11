/**
 * RF-BOD-04 — services/bodega/ordenesConsulta.js (listado y detalle para recepción) sobre la BD en memoria.
 */
jest.mock('../../../modelos/sistema_bodega/Orden_compra', () => require('../../helpers/bd-memoria-bodega').modelo('ordenes'));
jest.mock('../../../modelos/sistema_bodega/Orden_compra_item', () => require('../../helpers/bd-memoria-bodega').modelo('orden_items'));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => require('../../helpers/bd-memoria-bodega').modelo('proveedores'));
jest.mock('../../../modelos/sistema_base/Producto', () => require('../../helpers/bd-memoria-bodega').modelo('productos'));

const { reiniciar } = require('../../helpers/bd-memoria-bodega');
const consulta = require('../../../services/bodega/ordenesConsulta');

beforeEach(() => reiniciar({
  proveedores: [{ id: 1, nombre: 'Distribuidora Norte' }],
  productos: [{ id: 5, nombre: 'Guantes' }, { id: 6, nombre: 'Cloro' }],
  ordenes: [
    { id: 10, estado: 'ENVIADA', proveedor_id: 1, enviada_at: null },
    { id: 11, estado: 'RECIBIDA', proveedor_id: 1, enviada_at: null },
    { id: 12, estado: 'BORRADOR', proveedor_id: 1, enviada_at: null }
  ],
  orden_items: [
    { id: 100, orden_id: 10, producto_id: 5, cantidad: 10, cantidad_recibida: 4, costo_unitario: 900 },
    { id: 101, orden_id: 10, producto_id: 6, cantidad: 3, cantidad_recibida: 0, costo_unitario: null },
    { id: 102, orden_id: 11, producto_id: 5, cantidad: 2, cantidad_recibida: 2, costo_unitario: 900 }
  ]
}));

it('lista filtrando por estados, con proveedor y avance', async () => {
  const r = await consulta.listar({ estados: ['ENVIADA', 'RECIBIDA_PARCIAL'], page: 1, limit: 50 });
  expect(r.meta.total).toBe(1);
  expect(r.data[0]).toMatchObject({ id: 10, proveedor: 'Distribuidora Norte', lineas: 2, unidades_pedidas: 13, unidades_pendientes: 9 });
});

it('sin filtro lista todas, la más nueva primero', async () => {
  const r = await consulta.listar({ estados: null, page: 1, limit: 50 });
  expect(r.data.map((o) => o.id)).toEqual([12, 11, 10]);
});

it('detalle para recepción: nombre, recibido y pendiente por línea', async () => {
  const d = await consulta.detalleRecepcion(10);
  expect(d).toMatchObject({ id: 10, recibible: true, proveedor: 'Distribuidora Norte' });
  expect(d.items).toEqual([
    { item_id: 100, producto_id: 5, producto: 'Guantes', cantidad: 10, cantidad_recibida: 4, pendiente: 6, costo_unitario: 900 },
    { item_id: 101, producto_id: 6, producto: 'Cloro', cantidad: 3, cantidad_recibida: 0, pendiente: 3, costo_unitario: null }
  ]);
});

it('una orden RECIBIDA o BORRADOR no es recibible; inexistente -> 404', async () => {
  expect((await consulta.detalleRecepcion(11)).recibible).toBe(false);
  expect((await consulta.detalleRecepcion(12)).recibible).toBe(false);
  await expect(consulta.detalleRecepcion(99)).rejects.toMatchObject({ httpStatus: 404 });
});
