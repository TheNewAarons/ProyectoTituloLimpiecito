/**
 * RF-BOD-06 — conciliarProducto: cadena de saldos, aritmética y descuadre contra productos.stock.
 */
const { conciliarProducto } = require('../../../services/bodega/conciliacion');

const m = (id, cantidad, sa, sr, va, vm, vr) => ({ id: id, cantidad: cantidad, stock_anterior: sa, stock_resultante: sr, valor_saldo_anterior: va, valor_movimiento: vm, valor_saldo_resultante: vr });
const tipos = (h) => h.map((x) => x.tipo);

describe('conciliarProducto', () => {
  const sano = [m(1, 10, 0, 10, '0', '10000', '10000'), m(2, -4, 10, 6, '10000', '-4000', '6000')];

  it('cadena consistente y cuadrada con productos.stock: sin hallazgos', () => {
    expect(conciliarProducto(sano, 6)).toEqual([]);
  });

  it('productos.stock distinto del último saldo -> DESCUADRE_ACTUAL', () => {
    expect(conciliarProducto(sano, 8)).toEqual([{ tipo: 'DESCUADRE_ACTUAL', movimiento_id: 2, esperado: 8, encontrado: 6 }]);
  });

  it('cadena rota y aritmética errónea', () => {
    const roto = [m(1, 10, 0, 10, 0, 10000, 10000), m(2, -4, 9, 5, 9000, -4000, 6000)];
    expect(tipos(conciliarProducto(roto, 5))).toEqual(['CADENA_STOCK', 'CADENA_VALOR', 'ARITMETICA_VALOR']);
  });

  it('valor negativo y sin valor_movimiento', () => {
    expect(tipos(conciliarProducto([m(1, 1, 0, 1, 0, null, -5)], 1))).toEqual(['ARITMETICA_VALOR', 'VALOR_NEGATIVO']);
  });

  it('producto con stock y sin kardex -> SIN_KARDEX; sin stock ni kardex -> nada', () => {
    expect(tipos(conciliarProducto([], 3))).toEqual(['SIN_KARDEX']);
    expect(conciliarProducto([], null)).toEqual([]);
  });
});
