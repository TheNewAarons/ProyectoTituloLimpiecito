/**
 * RF-BOD-06 — Tests unitarios de services/bodega/kardex.js (Movimiento mockeado, sin BD).
 * Foco: costo promedio ponderado móvil en CLP entero (D-175, D-176), saldo inicial / descuadre y reversa con costo congelado.
 */
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => ({
  create: jest.fn(async (d) => Object.assign({ id: 100 }, d)),
  findOne: jest.fn()
}));

const Movimiento = require('../../../modelos/sistema_bodega/Movimiento_bodega');
const kardex = require('../../../services/bodega/kardex');
const { TIPOS_MOVIMIENTO: M } = require('../../../services/bodega/constantes');

const t = {};
const usuario = { id: 1, contexto: 'usuarios' };

function producto(data) {
  const inst = Object.assign({ id: 1 }, data);
  inst.update = jest.fn(async (c) => Object.assign(inst, c));
  return inst;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('valorizar (pura)', () => {
  it('entrada: valor = cantidad × costo', () => {
    expect(kardex.valorizar(10, 10000, 5, 1300)).toEqual({ costo_unitario: 1300, valor_movimiento: 6500, valor_saldo_resultante: 16500 });
  });

  it('salida parcial a promedio redondeado a peso entero', () => {
    // promedio 16500/15 = 1100; 4 × 1100 = 4400
    expect(kardex.valorizar(15, 16500, -4, 0)).toEqual({ costo_unitario: 1100, valor_movimiento: -4400, valor_saldo_resultante: 12100 });
    // 1 de 3 con valor 1000 -> 333 (no 333.33)
    expect(kardex.valorizar(3, 1000, -1, 0).valor_movimiento).toBe(-333);
  });

  it('salida que agota el stock se lleva el valor remanente (sin residuo por redondeo)', () => {
    expect(kardex.valorizar(3, 1000, -3, 0)).toEqual({ costo_unitario: 333, valor_movimiento: -1000, valor_saldo_resultante: 0 });
  });

  it('sin stock ni valor positivo sale a costo 0', () => {
    expect(kardex.valorizar(0, 0, -2, 0)).toEqual({ costo_unitario: 0, valor_movimiento: 0, valor_saldo_resultante: 0 });
  });
});

describe('registrar', () => {
  it('continúa el último saldo y aplica el delta a productos.stock', async () => {
    Movimiento.findOne.mockResolvedValue({ stock_resultante: 10, valor_saldo_resultante: 10000 });
    const p = producto({ stock: 10, costo_unitario: 1000 });

    const m = await kardex.registrar({ transaction: t, producto: p, tipo: M.ENTRADA_COMPRA, cantidad: 5, costoUnitario: 1300, usuario: usuario, referenciaTipo: 'ordenes_compra', referenciaId: 3, referenciaLineaId: 8 });

    expect(Movimiento.create).toHaveBeenCalledTimes(1);
    expect(p.stock).toBe(15);
    expect(m).toMatchObject({
      tipo: M.ENTRADA_COMPRA, cantidad: 5, stock_anterior: 10, stock_resultante: 15, costo_unitario: 1300,
      valor_movimiento: 6500, valor_saldo_anterior: 10000, valor_saldo_resultante: 16500, referencia_linea_id: 8
    });
  });

  it('stock modificado fuera del kardex: primero AJUSTE de descuadre y luego el movimiento', async () => {
    Movimiento.findOne.mockResolvedValue({ stock_resultante: 10, valor_saldo_resultante: 10000 });
    const p = producto({ stock: 12, costo_unitario: 1000 });

    await kardex.registrar({ transaction: t, producto: p, tipo: M.SALIDA_SOLICITUD, cantidad: -6, usuario: usuario });

    const [ajuste, salida] = Movimiento.create.mock.calls.map((c) => c[0]);
    expect(ajuste).toMatchObject({ tipo: M.AJUSTE, cantidad: 2, stock_anterior: 10, stock_resultante: 12, valor_movimiento: 2000, valor_saldo_resultante: 12000, contexto_usuario: 'SISTEMA' });
    expect(salida).toMatchObject({ stock_anterior: 12, stock_resultante: 6, valor_saldo_anterior: 12000, valor_movimiento: -6000, valor_saldo_resultante: 6000 });
  });

  it('producto sin kardex y con stock: SALDO_INICIAL a costo de referencia', async () => {
    Movimiento.findOne.mockResolvedValue(null);
    const p = producto({ stock: 4, costo_unitario: null, precio: 500 });

    await kardex.registrar({ transaction: t, producto: p, tipo: M.SALIDA_SOLICITUD, cantidad: -1, usuario: usuario });

    const [inicial, salida] = Movimiento.create.mock.calls.map((c) => c[0]);
    expect(inicial).toMatchObject({ tipo: M.SALDO_INICIAL, cantidad: 4, valor_saldo_resultante: 2000 });
    expect(salida).toMatchObject({ valor_movimiento: -500, stock_resultante: 3 });
  });

  it('reversa usa el valor de la salida original y la enlaza', async () => {
    Movimiento.findOne.mockResolvedValue({ stock_resultante: 2, valor_saldo_resultante: 3000 });
    const p = producto({ stock: 2 });
    const original = { id: 40, cantidad: -3, costo_unitario: 1000, valor_movimiento: -3000 };

    const m = await kardex.registrar({ transaction: t, producto: p, tipo: M.REVERSA, cantidad: 3, revierte: original, usuario: usuario });

    expect(m).toMatchObject({ movimiento_revertido_id: 40, costo_unitario: 1000, valor_movimiento: 3000, valor_saldo_resultante: 6000, stock_resultante: 5 });
  });

  it('rechaza cantidad 0 y reversa con cantidad distinta a la original', async () => {
    const p = producto({ stock: 1 });
    await expect(kardex.registrar({ transaction: t, producto: p, tipo: M.AJUSTE, cantidad: 0, usuario: usuario })).rejects.toMatchObject({ code: 'CANTIDAD_INVALIDA' });
    await expect(kardex.registrar({ transaction: t, producto: p, tipo: M.REVERSA, cantidad: 2, revierte: { id: 1, cantidad: -3 }, usuario: usuario }))
      .rejects.toMatchObject({ code: 'REVERSA_INVALIDA' });
    expect(p.update).not.toHaveBeenCalled();
  });
});
