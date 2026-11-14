/**
 * RF-BOD-05 — services/bodega/dashboard.js con modelos simulados.
 * Foco: contadores desde COUNT (no desde listas recortadas), regla de alerta y auditoría del stock mínimo.
 */
const mockT = { id: 'tx', LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../../database/database', () => ({
  sequelize: {
    fn: (nombre, col) => ({ fn: nombre, col: col }),
    col: (c) => ({ col: c }),
    literal: (sql) => ({ literal: sql }),
    transaction: jest.fn(async (fn) => fn(mockT))
  }
}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));
jest.mock('../../../services/bodega/cruceStock', () => ({ listaCompra: jest.fn() }));
jest.mock('../../../services/bodega/ordenesConsulta', () => ({ listar: jest.fn() }));
jest.mock('../../../modelos/sistema_bodega/Solicitud_bodega', () => ({ findAll: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Producto', () => ({ count: jest.fn(), findAll: jest.fn(), findById: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({ findAll: jest.fn(async () => [{ id: 3, numero_cc: 1 }]) }));
jest.mock('../../../modelos/sistema_bodega/Orden_compra', () => ({ findAll: jest.fn() }));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({ findAll: jest.fn(async () => [{ id: 9, nombre: 'Distribuidora Norte' }]) }));

const Solicitud = require('../../../modelos/sistema_bodega/Solicitud_bodega');
const Producto = require('../../../modelos/sistema_base/Producto');
const Orden_compra = require('../../../modelos/sistema_bodega/Orden_compra');
const cruceStock = require('../../../services/bodega/cruceStock');
const ordenesConsulta = require('../../../services/bodega/ordenesConsulta');
const { auditar } = require('../../../services/auditoria');
const dashboard = require('../../../services/bodega/dashboard');

beforeEach(() => {
  jest.clearAllMocks();
  // Solicitudes: el GROUP BY dice 40 pendientes, aunque la lista recortada traiga 2.
  Solicitud.findAll.mockImplementation(async (o) => (o.group
    ? [{ estado: 'PENDIENTE', n: '40' }, { estado: 'LISTA_ENTREGA', n: '7' }]
    : [{ id: 1, estado: 'PENDIENTE', centro_costo_id: 3, created_at: new Date('2026-11-01') }, { id: 2, estado: 'PARCIAL', centro_costo_id: 3, created_at: new Date('2026-11-02') }]));
  // Stock: COUNT dice 900 activos y 12 bajo mínimo; la lista trae 3.
  Producto.count.mockImplementation(async (o) => (o.where && Object.getOwnPropertySymbols(o.where).length ? 12 : 900));
  Producto.findAll.mockResolvedValue([
    { id: 1, nombre: 'Alcohol', stock: 2, stock_minimo: 5 },
    { id: 2, nombre: 'Cloro', stock: 5, stock_minimo: 5 },
    { id: 3, nombre: 'Guantes', stock: null, stock_minimo: 0 }
  ]);
  cruceStock.listaCompra.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ producto_id: i + 1, producto: 'P' + (i + 1), cantidad_a_comprar: i + 1, proveedor_id: i < 2 ? null : 9 })));
  ordenesConsulta.listar.mockResolvedValue({ data: [{ id: 50 }], meta: { page: 1, limit: 10, total: 33 } });
  Orden_compra.findAll.mockResolvedValue([{ estado: 'ENVIADA', n: '30' }, { estado: 'RECIBIDA_PARCIAL', n: '3' }]);
});

describe('GET /dashboard', () => {
  it('los contadores salen de COUNT/GROUP BY, no del largo de las listas recortadas', async () => {
    const { data } = await dashboard.obtener();
    expect(data.solicitudes.por_estado).toEqual({ PENDIENTE: 40, PARCIAL: 0, LISTA_ENTREGA: 7 });
    expect(data.solicitudes.total_activas).toBe(47);
    expect(data.solicitudes.mas_antiguas).toHaveLength(2);
    expect(data.stock).toMatchObject({ total_activos: 900, total_bajo_minimo: 12, truncado: true });
    expect(data.stock.productos).toHaveLength(3);
    expect(data.ordenes_transito).toMatchObject({ total: 33, por_estado: { ENVIADA: 30, RECIBIDA_PARCIAL: 3 } });
  });

  it('el contador de bajo mínimo usa la misma regla en SQL (stock_minimo > 0 y stock <= stock_minimo)', async () => {
    await dashboard.obtener();
    const llamada = Producto.count.mock.calls.find((c) => Object.getOwnPropertySymbols(c[0].where).length);
    const literal = Object.getOwnPropertySymbols(llamada[0].where).map((s) => llamada[0].where[s])[0];
    expect(literal.literal).toBe('stock_minimo > 0 AND COALESCE(stock, 0) <= stock_minimo');
  });

  it('alerta con stock <= mínimo (igual al mínimo también); sin mínimo nunca; stock NULL cuenta como 0', async () => {
    const { data } = await dashboard.obtener();
    expect(data.stock.productos.map((p) => [p.nombre, p.bajo_minimo, p.stock])).toEqual([['Alcohol', true, 2], ['Cloro', true, 5], ['Guantes', false, 0]]);
    expect(dashboard.bajoMinimo({ stock: 6, stock_minimo: 5 })).toBe(false);
    expect(dashboard.bajoMinimo({ stock: null, stock_minimo: 1 })).toBe(true);
    expect(dashboard.bajoMinimo({ stock: 0, stock_minimo: 0 })).toBe(false);
    // Stock negativo (dato heredado) también alerta, igual que COALESCE(stock,0) <= stock_minimo en SQL.
    expect(dashboard.bajoMinimo({ stock: -2, stock_minimo: 1 })).toBe(true);
  });

  it('pide stock con bajo mínimo primero y con tope 500', async () => {
    await dashboard.obtener();
    const o = Producto.findAll.mock.calls[0][0];
    expect(o.limit).toBe(500);
    expect(o.order[0][0].literal).toMatch(/^CASE WHEN stock_minimo > 0/);
  });

  it('lista de compra: totales de la lista completa, top 10 por cantidad y conteo sin proveedor', async () => {
    const { data } = await dashboard.obtener();
    expect(data.lista_compra).toMatchObject({ total_productos: 13, total_unidades: 91, sin_proveedor: 2 });
    expect(data.lista_compra.productos).toHaveLength(10);
    expect(data.lista_compra.productos[0].cantidad_a_comprar).toBe(13);
  });

  it('lista de compra con nombre de proveedor (spec: "con cantidad y proveedor"); sin proveedor queda null', async () => {
    cruceStock.listaCompra.mockResolvedValue([
      { producto_id: 1, producto: 'Cloro', cantidad_a_comprar: 5, proveedor_id: 9 },
      { producto_id: 2, producto: 'Guantes', cantidad_a_comprar: 3, proveedor_id: null }
    ]);
    const { data } = await dashboard.obtener();
    expect(data.lista_compra.productos).toEqual([
      { producto_id: 1, producto: 'Cloro', cantidad_a_comprar: 5, proveedor_id: 9, proveedor: 'Distribuidora Norte' },
      { producto_id: 2, producto: 'Guantes', cantidad_a_comprar: 3, proveedor_id: null, proveedor: null }
    ]);
  });

  it('órdenes en tránsito: pide ENVIADA y RECIBIDA_PARCIAL con tope 10', async () => {
    await dashboard.obtener();
    expect(ordenesConsulta.listar).toHaveBeenCalledWith({ estados: ['ENVIADA', 'RECIBIDA_PARCIAL'], page: 1, limit: 10 });
  });
});

describe('PATCH stock mínimo', () => {
  it('actualiza dentro de una transacción con lock y registra auditoría STOCK_MINIMO', async () => {
    const producto = { id: 1, nombre: 'Cloro', stock: 4, stock_minimo: 0, estado: 1, update: jest.fn(async () => ({})) };
    Producto.findById.mockResolvedValue(producto);
    const r = await dashboard.actualizarStockMinimo(1, 5, { id: 9, contexto: 'usuarios' }, '::1');
    expect(Producto.findById).toHaveBeenCalledWith(1, expect.objectContaining({ lock: 'UPDATE', transaction: mockT }));
    expect(producto.update).toHaveBeenCalledWith({ stock_minimo: 5 }, { transaction: mockT });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockT, entidad: 'productos', entidad_id: 1, accion: 'STOCK_MINIMO', antes: { stock_minimo: 0 }, despues: { stock_minimo: 5 }
    }));
    expect(r).toEqual({ id: 1, nombre: 'Cloro', stock: 4, stock_minimo: 5, bajo_minimo: true });
  });

  it('producto inactivo -> 409 PRODUCTO_INACTIVO sin escribir ni auditar', async () => {
    const producto = { id: 2, nombre: 'Viejo', stock: 0, stock_minimo: 0, estado: 0, update: jest.fn() };
    Producto.findById.mockResolvedValue(producto);
    await expect(dashboard.actualizarStockMinimo(2, 5, { id: 9, contexto: 'usuarios' })).rejects.toMatchObject({ code: 'PRODUCTO_INACTIVO', httpStatus: 409 });
    expect(producto.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('mismo valor que el actual: no escribe ni deja auditoría vacía', async () => {
    const producto = { id: 1, nombre: 'Cloro', stock: 4, stock_minimo: 5, estado: 1, update: jest.fn() };
    Producto.findById.mockResolvedValue(producto);
    const r = await dashboard.actualizarStockMinimo(1, 5, { id: 9, contexto: 'usuarios' });
    expect(r).toMatchObject({ stock_minimo: 5, bajo_minimo: true });
    expect(producto.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('producto inexistente -> 404 sin auditoría', async () => {
    Producto.findById.mockResolvedValue(null);
    await expect(dashboard.actualizarStockMinimo(99, 1, { id: 9, contexto: 'usuarios' })).rejects.toMatchObject({ httpStatus: 404 });
    expect(auditar).not.toHaveBeenCalled();
  });
});
