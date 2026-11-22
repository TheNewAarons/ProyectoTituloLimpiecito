/**
 * RF-BOD-07 — services/bodega/conteos.js sobre la BD en memoria (tests/helpers).
 * Cubre: snapshot al crear, captura, estados, AJUSTE vía kardex al aprobar, recálculo contra stock actual y exactitud.
 */
const H = '../../helpers/bd-memoria-bodega';
jest.mock('../../../database/database', () => ({ sequelize: require('../../helpers/bd-memoria-bodega').sequelize }));
jest.mock('../../../services/auditoria', () => ({ auditar: require('../../helpers/bd-memoria-bodega').auditar }));
jest.mock('../../../services/caja/cierre', () => ({ reintentarTransaccion: (fn) => fn() }));
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => require('../../helpers/bd-memoria-bodega').modelo('movimientos'));
jest.mock('../../../modelos/sistema_bodega/Inventario_conteo', () => require('../../helpers/bd-memoria-bodega').modelo('conteos'));
jest.mock('../../../modelos/sistema_bodega/Inventario_conteo_item', () => require('../../helpers/bd-memoria-bodega').modelo('conteo_items'));
jest.mock('../../../modelos/sistema_base/Producto', () => require('../../helpers/bd-memoria-bodega').modelo('productos'));

const { reiniciar, tabla } = require(H);
const conteos = require('../../../services/bodega/conteos');

const ctx = { usuario: { id: 1, contexto: 'usuarios' }, ip: '::1' };
const fila = (t, id) => tabla(t).filter((f) => f.id === id)[0];
const ajustesDe = (conteoId) => tabla('movimientos').filter((m) => m.referencia_tipo === 'inventario_conteos' && m.referencia_id === conteoId);

// Saldos de kardex coherentes con el stock para que kardex.registrar no agregue AJUSTE de descuadre.
function escenario() {
  reiniciar({
    productos: [
      { id: 1, nombre: 'Guantes', estado: 1, stock: 10, costo_unitario: 1000 },
      { id: 2, nombre: 'Cloro', estado: 1, stock: 5, costo_unitario: 800 },
      { id: 3, nombre: 'Viejo', estado: 0, stock: 7, costo_unitario: 500 },
      { id: 4, nombre: 'Sin stock', estado: 1, stock: null, costo_unitario: null }
    ],
    movimientos: [
      { id: 1, producto_id: 1, tipo: 'AJUSTE', cantidad: 10, stock_anterior: 0, stock_resultante: 10, costo_unitario: 1000, valor_saldo_resultante: 10000 },
      { id: 2, producto_id: 2, tipo: 'AJUSTE', cantidad: 5, stock_anterior: 0, stock_resultante: 5, costo_unitario: 800, valor_saldo_resultante: 4000 }
    ],
    conteos: [],
    conteo_items: []
  });
}

beforeEach(escenario);

describe('crear', () => {
  it('sin producto_ids toma los activos con snapshot del stock (null = 0)', async () => {
    const r = await conteos.crear({ producto_ids: null, observacion: 'Mensual' }, ctx);
    expect(r).toEqual({ id: 1, estado: 'BORRADOR', items_total: 3 });
    expect(tabla('conteo_items').map((i) => [i.producto_id, i.cantidad_teorica])).toEqual([[1, 10], [2, 5], [4, 0]]);
    expect(tabla('auditoria')[0]).toMatchObject({ entidad: 'inventario_conteos', accion: 'CREAR' });
  });

  it('con producto_ids inexistentes responde 400 y no crea nada', async () => {
    await expect(conteos.crear({ producto_ids: [1, 99], observacion: null }, ctx)).rejects.toMatchObject({ code: 'PRODUCTO_NO_EXISTE', httpStatus: 400 });
    expect(tabla('conteos')).toHaveLength(0);
  });
});

describe('captura, anulación y aprobación', () => {
  beforeEach(() => conteos.crear({ producto_ids: [1, 2], observacion: null }, ctx));

  it('capturar calcula la diferencia contra el snapshot y la exactitud', async () => {
    const r = await conteos.capturar(1, [{ item_id: 1, cantidad_contada: 8, motivo: 'Merma' }, { item_id: 2, cantidad_contada: 5, motivo: null }], ctx);
    expect(r.items.map((i) => i.diferencia)).toEqual([-2, 0]);
    expect(r.exactitud).toBe(50);
    expect(r.items_contados).toBe(2);
  });

  it('item de otro conteo responde 400', async () => {
    await expect(conteos.capturar(1, [{ item_id: 99, cantidad_contada: 1, motivo: null }], ctx)).rejects.toMatchObject({ code: 'ITEM_NO_PERTENECE' });
  });

  it('aprobar sin contados responde 400', async () => {
    await expect(conteos.aprobar(1, ctx)).rejects.toMatchObject({ code: 'SIN_CONTADOS', httpStatus: 400 });
  });

  it('aprobar genera AJUSTE por cada diferencia vía kardex, sin tocar los que cuadran', async () => {
    await conteos.capturar(1, [{ item_id: 1, cantidad_contada: 8, motivo: 'Merma' }, { item_id: 2, cantidad_contada: 5, motivo: null }], ctx);
    const r = await conteos.aprobar(1, ctx);
    const movs = ajustesDe(1);
    expect(movs).toEqual([expect.objectContaining({ producto_id: 1, tipo: 'AJUSTE', cantidad: -2, stock_resultante: 8, referencia_linea_id: 1, motivo: 'Merma' })]);
    expect(r.ajustes).toEqual([{ item_id: 1, producto_id: 1, cantidad: -2, movimiento_id: movs[0].id }]);
    expect(r.recalculados).toEqual([]);
    expect(fila('productos', 1).stock).toBe(8);
    expect(fila('productos', 2).stock).toBe(5);
    expect(fila('conteo_items', 1).movimiento_id).toBe(movs[0].id);
    expect(fila('conteo_items', 2).movimiento_id).toBeNull();
    expect(fila('conteos', 1)).toMatchObject({ estado: 'APROBADO', aprobado_por: 1 });
    expect(r.conteo.exactitud).toBe(50);
  });

  it('si el stock cambió desde el snapshot, ajusta contra el stock actual y lo informa', async () => {
    await conteos.capturar(1, [{ item_id: 1, cantidad_contada: 8, motivo: null }], ctx);
    // Salida de 3 unidades después del snapshot (10): el ajuste debe ser 8 − 7 = +1, no −2.
    fila('productos', 1).stock = 7;
    tabla('movimientos').push({ id: 3, producto_id: 1, tipo: 'SALIDA_SOLICITUD', cantidad: -3, stock_anterior: 10, stock_resultante: 7, costo_unitario: 1000, valor_saldo_resultante: 7000 });
    const r = await conteos.aprobar(1, ctx);
    expect(r.recalculados).toEqual([{ item_id: 1, producto_id: 1, cantidad_teorica: 10, stock_actual: 7 }]);
    expect(ajustesDe(1)).toEqual([expect.objectContaining({ cantidad: 1, motivo: 'Conteo físico N° 1' })]);
    expect(fila('productos', 1).stock).toBe(8);
    expect(fila('conteo_items', 1).diferencia).toBe(1);
  });

  it('aprobado o anulado ya no se modifica (409)', async () => {
    await conteos.capturar(1, [{ item_id: 1, cantidad_contada: 10, motivo: null }], ctx);
    await conteos.aprobar(1, ctx);
    await expect(conteos.capturar(1, [{ item_id: 1, cantidad_contada: 1, motivo: null }], ctx)).rejects.toMatchObject({ code: 'CONTEO_NO_EDITABLE', httpStatus: 409 });
    await expect(conteos.anular(1, null, ctx)).rejects.toMatchObject({ httpStatus: 409 });
    await expect(conteos.aprobar(1, ctx)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('anular deja el conteo ANULADO sin movimientos', async () => {
    const r = await conteos.anular(1, 'Error de carga', ctx);
    expect(r.estado).toBe('ANULADO');
    expect(ajustesDe(1)).toHaveLength(0);
    expect(tabla('auditoria').pop()).toMatchObject({ accion: 'ANULAR', motivo: 'Error de carga' });
  });
});

describe('listar', () => {
  it('pagina con KPI por conteo', async () => {
    await conteos.crear({ producto_ids: [1], observacion: null }, ctx);
    await conteos.crear({ producto_ids: [2], observacion: null }, ctx);
    const r = await conteos.listar({ estado: null, page: 1, limit: 1 });
    expect(r.meta).toEqual({ page: 1, limit: 1, total: 2 });
    expect(r.data).toEqual([expect.objectContaining({ id: 2, items_total: 1, items_contados: 0, exactitud: null })]);
  });
});
