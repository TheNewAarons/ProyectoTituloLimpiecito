/**
 * RNF-ARQ-01 (cierre D-ARQ-01-1) — services/bodega/stock-rapido-anular.js sobre la BD en memoria (tests/helpers).
 * Cubre: REVERSA enlazada con costo congelado, marca de anulación sin borrado, 404/409/400, entrada previa al kardex
 * y dos anulaciones simultáneas de la misma entrada.
 */
jest.mock('../../../database/database', () => ({ sequelize: require('../../helpers/bd-memoria-bodega').sequelize }));
jest.mock('../../../services/auditoria', () => ({ auditar: require('../../helpers/bd-memoria-bodega').auditar }));
jest.mock('../../../services/caja/cierre', () => ({ reintentarTransaccion: (fn) => fn() }));
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => require('../../helpers/bd-memoria-bodega').modelo('movimientos'));
jest.mock('../../../modelos/sistema_base/Stock_rapido', () => require('../../helpers/bd-memoria-bodega').modelo('stock_rapidos'));
jest.mock('../../../modelos/sistema_base/Producto', () => require('../../helpers/bd-memoria-bodega').modelo('productos'));

const { reiniciar, tabla } = require('../../helpers/bd-memoria-bodega');
const servicio = require('../../../services/bodega/stock-rapido-anular');

const ctx = { usuario: { id: 7, contexto: 'usuarios' }, ip: '::1' };
const fila = (t, id) => tabla(t).filter((f) => f.id === id)[0];

// Producto 1: 6 previas a $1.000 + entrada rápida #1 de 4 a $1.500 (ENTRADA_MANUAL) = 10 u, $12.000.
// Producto 2: entrada rápida #2 de 3 anterior al kardex (sin movimiento). Producto 3: entrada #3 de 5 ya consumida.
function escenario() {
  reiniciar({
    productos: [
      { id: 1, nombre: 'Guantes', estado: 1, stock: 10, costo_unitario: 1200 },
      { id: 2, nombre: 'Cloro', estado: 1, stock: 3, costo_unitario: 800 },
      { id: 3, nombre: 'Bolsas', estado: 1, stock: 2, costo_unitario: 100 }
    ],
    movimientos: [
      { id: 1, producto_id: 1, tipo: 'AJUSTE', cantidad: 6, stock_anterior: 0, stock_resultante: 6, costo_unitario: 1000, valor_movimiento: 6000, valor_saldo_resultante: 6000 },
      { id: 2, producto_id: 1, tipo: 'ENTRADA_MANUAL', cantidad: 4, referencia_tipo: 'stock_rapidos', referencia_id: 1, stock_anterior: 6, stock_resultante: 10,
        costo_unitario: 1500, valor_movimiento: 6000, valor_saldo_resultante: 12000 },
      { id: 3, producto_id: 2, tipo: 'SALDO_INICIAL', cantidad: 3, stock_anterior: 0, stock_resultante: 3, costo_unitario: 800, valor_movimiento: 2400, valor_saldo_resultante: 2400 },
      { id: 4, producto_id: 3, tipo: 'SALDO_INICIAL', cantidad: 2, stock_anterior: 0, stock_resultante: 2, costo_unitario: 100, valor_movimiento: 200, valor_saldo_resultante: 200 }
    ],
    stock_rapidos: [
      { id: 1, productoId: 1, cantidad: 4, comentario: 'compra local', fecha: new Date('2026-11-20T12:00:00Z'), anulada_at: null },
      { id: 2, productoId: 2, cantidad: 3, comentario: 'antiguo', fecha: new Date('2026-01-10T12:00:00Z'), anulada_at: null },
      { id: 3, productoId: 3, cantidad: 5, comentario: 'ya usado', fecha: new Date('2026-11-01T12:00:00Z'), anulada_at: null }
    ]
  });
}

beforeEach(escenario);

describe('anular', () => {
  it('registra una REVERSA enlazada al ENTRADA_MANUAL con su costo, descuenta el stock y marca la fila sin borrarla', async () => {
    const r = await servicio.anular(1, '  Ingresado por error  ', ctx);
    const reversa = fila('movimientos', r.movimiento_id);
    expect(reversa).toMatchObject({
      tipo: 'REVERSA', cantidad: -4, movimiento_revertido_id: 2, referencia_tipo: 'stock_rapidos', referencia_id: 1,
      costo_unitario: 1500, valor_movimiento: -6000, valor_saldo_resultante: 6000, stock_anterior: 10, stock_resultante: 6, usuario_id: 7
    });
    expect(fila('productos', 1).stock).toBe(6);
    expect(tabla('stock_rapidos')).toHaveLength(3);
    expect(fila('stock_rapidos', 1)).toMatchObject({ anulada_por: 7, contexto_anulacion: 'usuarios', motivo_anulacion: 'Ingresado por error' });
    expect(fila('stock_rapidos', 1).anulada_at).toBeInstanceOf(Date);
    expect(r).toMatchObject({ id: 1, motivo_anulacion: 'Ingresado por error', producto: { id: 1, stock: 6 } });
    expect(tabla('auditoria').map((a) => [a.entidad, a.accion])).toEqual([['stock_rapidos', 'ANULAR'], ['productos', 'AJUSTE']]);
    // Un solo movimiento nuevo: el kardex estaba cuadrado, sin AJUSTE de descuadre.
    expect(tabla('movimientos')).toHaveLength(5);
  });

  it('una entrada ya anulada responde 409 y no mueve stock', async () => {
    await servicio.anular(1, 'Ingresado por error', ctx);
    await expect(servicio.anular(1, 'otra vez', ctx)).rejects.toMatchObject({ code: 'YA_ANULADA', httpStatus: 409 });
    expect(fila('productos', 1).stock).toBe(6);
    expect(tabla('movimientos')).toHaveLength(5);
  });

  it('si lo ingresado ya se consumió responde 409 STOCK_INSUFICIENTE sin escribir', async () => {
    await expect(servicio.anular(3, 'Ingresado por error', ctx)).rejects.toMatchObject({
      code: 'STOCK_INSUFICIENTE', httpStatus: 409, details: { producto_id: 3, stock_actual: 2, cantidad: 5 }
    });
    expect(fila('stock_rapidos', 3).anulada_at).toBeNull();
    expect(fila('productos', 3).stock).toBe(2);
    expect(tabla('movimientos')).toHaveLength(4);
    expect(tabla('auditoria')).toHaveLength(0);
  });

  it('entrada anterior al kardex: AJUSTE negativo con motivo explícito (no hay movimiento que revertir)', async () => {
    const r = await servicio.anular(2, 'Duplicada', ctx);
    expect(fila('movimientos', r.movimiento_id)).toMatchObject({
      tipo: 'AJUSTE', cantidad: -3, movimiento_revertido_id: null, referencia_id: 2, stock_resultante: 0,
      motivo: 'Anulación de stock rápido sin entrada en kardex: Duplicada'
    });
    expect(fila('productos', 2).stock).toBe(0);
  });

  it('motivo vacío o demasiado largo responde 400; id inexistente 404', async () => {
    await expect(servicio.anular(1, '  ', ctx)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    await expect(servicio.anular(1, undefined, ctx)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO' });
    await expect(servicio.anular(1, 'x'.repeat(256), ctx)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO' });
    await expect(servicio.anular(99, 'Ingresado por error', ctx)).rejects.toMatchObject({ code: 'NO_ENCONTRADO', httpStatus: 404 });
    expect(tabla('movimientos')).toHaveLength(4);
  });

  it('dos anulaciones simultáneas de la misma entrada: una gana, la otra 409, el stock baja una sola vez', async () => {
    const r = await Promise.allSettled([servicio.anular(1, 'Primera', ctx), servicio.anular(1, 'Segunda', ctx)]);
    expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(r.filter((x) => x.status === 'rejected')[0].reason).toMatchObject({ code: 'YA_ANULADA' });
    expect(fila('productos', 1).stock).toBe(6);
    expect(tabla('movimientos').filter((m) => m.tipo === 'REVERSA')).toHaveLength(1);
  });
});
