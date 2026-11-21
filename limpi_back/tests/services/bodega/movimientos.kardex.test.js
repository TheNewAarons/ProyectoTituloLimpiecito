/**
 * RF-BOD-06 — movimientos.kardex: saldo vigente, costo promedio y detección de descuadre (modelos mockeados).
 */
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => ({ findAndCountAll: jest.fn(), findOne: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Producto', () => ({ findById: jest.fn() }));

const Movimiento = require('../../../modelos/sistema_bodega/Movimiento_bodega');
const Producto = require('../../../modelos/sistema_base/Producto');
const { kardex } = require('../../../services/bodega/movimientos');

const FILTROS = { page: 1, limit: 50 };
const mov = (d) => Object.assign({ id: 1, tipo: 'ENTRADA_COMPRA', cantidad: 5, referencia_tipo: null, referencia_id: null, contexto_usuario: 'usuarios', usuario_id: 1, created_at: new Date() }, d);

beforeEach(() => jest.clearAllMocks());

describe('kardex', () => {
  it('saldo cuadrado: costo promedio = valor / stock y movimientos con sus saldos', async () => {
    Producto.findById.mockResolvedValue({ id: 7, nombre: 'Guantes', stock: 15 });
    const filas = [
      mov({ id: 1, tipo: 'SALDO_INICIAL', cantidad: 10, stock_anterior: 0, stock_resultante: 10, costo_unitario: '1000', valor_movimiento: '10000', valor_saldo_anterior: '0', valor_saldo_resultante: '10000' }),
      mov({ id: 2, cantidad: 5, stock_anterior: 10, stock_resultante: 15, costo_unitario: '1300', valor_movimiento: '6500', valor_saldo_anterior: '10000', valor_saldo_resultante: '16500' })
    ];
    Movimiento.findAndCountAll.mockResolvedValue({ rows: filas, count: 2 });
    Movimiento.findOne.mockResolvedValue(filas[1]);

    const r = await kardex(7, FILTROS);

    expect(Movimiento.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: { producto_id: 7 }, order: [['id', 'ASC']] }));
    expect(r.data.saldo).toEqual({ stock: 15, stock_kardex: 15, valor_saldo: 16500, costo_promedio: 1100, cuadrado: true });
    expect(r.data.movimientos[1]).toMatchObject({ costo_unitario: 1300, valor_movimiento: 6500, valor_saldo_resultante: 16500 });
    expect(r.meta).toEqual({ page: 1, limit: 50, total: 2 });
  });

  it('stock modificado fuera del kardex -> cuadrado false; sin kardex -> saldos null', async () => {
    Producto.findById.mockResolvedValue({ id: 7, nombre: 'Guantes', stock: 12 });
    Movimiento.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    Movimiento.findOne.mockResolvedValue(mov({ stock_resultante: 10, valor_saldo_resultante: '10000' }));
    expect((await kardex(7, FILTROS)).data.saldo.cuadrado).toBe(false);

    Movimiento.findOne.mockResolvedValue(null);
    expect((await kardex(7, FILTROS)).data.saldo).toEqual({ stock: 12, stock_kardex: null, valor_saldo: null, costo_promedio: null, cuadrado: null });
  });

  it('producto inexistente -> 404 PRODUCTO_NO_EXISTE', async () => {
    Producto.findById.mockResolvedValue(null);
    await expect(kardex(99, FILTROS)).rejects.toMatchObject({ code: 'PRODUCTO_NO_EXISTE', httpStatus: 404 });
  });
});
