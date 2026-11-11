/**
 * RF-BOD-04 — services/bodega/recepcion.js sobre la BD en memoria con locks de fila (tests/helpers).
 * Cubre: FIFO, parcial vs total, validaciones, costo, orden de locks y concurrencia recepción vs anulación.
 */
const H = '../../helpers/bd-memoria-bodega';
jest.mock('../../../database/database', () => ({ sequelize: require('../../helpers/bd-memoria-bodega').sequelize }));
jest.mock('../../../services/auditoria', () => ({ auditar: require('../../helpers/bd-memoria-bodega').auditar }));
jest.mock('../../../services/caja/cierre', () => ({ reintentarTransaccion: (fn) => fn() }));
jest.mock('../../../modelos/sistema_bodega/Solicitud_bodega', () => require('../../helpers/bd-memoria-bodega').modelo('solicitudes'));
jest.mock('../../../modelos/sistema_bodega/Solicitud_item', () => require('../../helpers/bd-memoria-bodega').modelo('items'));
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => require('../../helpers/bd-memoria-bodega').modelo('movimientos'));
jest.mock('../../../modelos/sistema_bodega/Orden_compra', () => require('../../helpers/bd-memoria-bodega').modelo('ordenes'));
jest.mock('../../../modelos/sistema_bodega/Orden_compra_item', () => require('../../helpers/bd-memoria-bodega').modelo('orden_items'));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => require('../../helpers/bd-memoria-bodega').modelo('proveedores'));
jest.mock('../../../modelos/sistema_base/Producto', () => require('../../helpers/bd-memoria-bodega').modelo('productos'));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => require('../../helpers/bd-memoria-bodega').modelo('centros'));
jest.mock('../../../modelos/sistema_base/Centro_costo_trabajadore', () => require('../../helpers/bd-memoria-bodega').modelo('asignaciones'));
jest.mock('../../../modelos/sistema_base/Cliente', () => require('../../helpers/bd-memoria-bodega').modelo('clientes'));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => require('../../helpers/bd-memoria-bodega').modelo('trabajadores'));
jest.mock('../../../modelos/sistema_base/Usuario', () => require('../../helpers/bd-memoria-bodega').modelo('usuarios'));

const { bd, reiniciar, tabla } = require(H);
const recepcion = require('../../../services/bodega/recepcion');
const solicitudes = require('../../../services/bodega/solicitudes');

const ADMIN = { id: 1, contexto: 'usuarios', rol_nombre: 'Administrador' };
const ctx = { usuario: { id: 1, contexto: 'usuarios' }, ip: '::1' };

// Producto 1 sin stock; tres solicitudes PARCIAL (FIFO por id) con faltante del producto 1; orden 10 ENVIADA.
function escenario(extra) {
  reiniciar(Object.assign({
    productos: [{ id: 1, nombre: 'Guantes', estado: 1, stock: 0, costo_unitario: 900, precio: 1500 }, { id: 2, nombre: 'Cloro', estado: 1, stock: 0, costo_unitario: null, precio: 800 }],
    solicitudes: [
      { id: 1, estado: 'PARCIAL', centro_costo_id: 3, trabajador_id: 4, usuario_id: null },
      { id: 2, estado: 'PARCIAL', centro_costo_id: 3, trabajador_id: 4, usuario_id: null },
      { id: 3, estado: 'PARCIAL', centro_costo_id: 3, trabajador_id: 4, usuario_id: null }
    ],
    items: [
      { id: 1, solicitud_id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 0, cantidad_faltante: 5 },
      { id: 2, solicitud_id: 2, producto_id: 1, cantidad_pedida: 4, cantidad_asignada: 1, cantidad_faltante: 3 },
      { id: 3, solicitud_id: 3, producto_id: 1, cantidad_pedida: 6, cantidad_asignada: 0, cantidad_faltante: 6 }
    ],
    ordenes: [{ id: 10, estado: 'ENVIADA', proveedor_id: 1 }],
    orden_items: [{ id: 100, orden_id: 10, producto_id: 1, cantidad: 10, cantidad_recibida: 0, costo_unitario: 1000 }],
    movimientos: []
  }, extra || {}));
}

const fila = (t, id) => tabla(t).filter((f) => f.id === id)[0];
const movs = (tipo) => tabla('movimientos').filter((m) => m.tipo === tipo);

describe('recepción y asignación FIFO', () => {
  beforeEach(() => escenario());

  it('recibe 10: entrada, FIFO a la más antigua primero y excedente sin asignar', async () => {
    const r = await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 10 }], ctx);
    // FIFO: solicitud 1 (5) y solicitud 2 (3) se completan; la 3 recibe solo los 2 que quedan.
    expect(r.asignaciones).toEqual([
      { solicitud_id: 1, producto_id: 1, cantidad: 5 }, { solicitud_id: 2, producto_id: 1, cantidad: 3 }, { solicitud_id: 3, producto_id: 1, cantidad: 2 }
    ]);
    expect(r.solicitudes_listas).toEqual([1, 2]);
    expect(fila('solicitudes', 1).estado).toBe('LISTA_ENTREGA');
    expect(fila('solicitudes', 2).estado).toBe('LISTA_ENTREGA');
    expect(fila('solicitudes', 3).estado).toBe('PARCIAL');
    expect(fila('items', 3)).toMatchObject({ cantidad_asignada: 2, cantidad_faltante: 4 });
    expect(fila('productos', 1).stock).toBe(0);
    expect(movs('ENTRADA_COMPRA')).toEqual([expect.objectContaining({ producto_id: 1, cantidad: 10, referencia_tipo: 'ordenes_compra', referencia_id: 10 })]);
    expect(movs('SALIDA_SOLICITUD').map((m) => m.cantidad)).toEqual([-5, -3, -2]);
  });

  it('lo que sobra tras cubrir todos los faltantes queda como stock libre', async () => {
    tabla('orden_items')[0].cantidad = 20;
    await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 20 }], ctx);
    expect(tabla('solicitudes').every((s) => s.estado === 'LISTA_ENTREGA')).toBe(true);
    expect(fila('productos', 1).stock).toBe(20 - 14);
  });

  it('el stock queda igual a la suma de movimientos (stock inicial 0)', async () => {
    await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 7 }], ctx);
    const suma = tabla('movimientos').filter((m) => m.producto_id === 1).reduce((a, m) => a + m.cantidad, 0);
    expect(fila('productos', 1).stock).toBe(suma);
  });

  it('actualiza costo_unitario con el último costo de la orden; sin costo en la línea conserva el anterior', async () => {
    tabla('orden_items').push({ id: 101, orden_id: 10, producto_id: 2, cantidad: 3, cantidad_recibida: 0, costo_unitario: null });
    await recepcion.recibir(10, null, ctx);
    expect(fila('productos', 1).costo_unitario).toBe(1000);
    expect(fila('productos', 2).costo_unitario).toBeNull();
  });
});

describe('parcial vs total', () => {
  beforeEach(() => escenario());

  it('recibir menos de lo pedido deja la orden RECIBIDA_PARCIAL; completar en una segunda recepción la deja RECIBIDA', async () => {
    const r1 = await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 4 }], ctx);
    expect(r1.estado).toBe('RECIBIDA_PARCIAL');
    expect(fila('orden_items', 100).cantidad_recibida).toBe(4);
    const r2 = await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 6 }], ctx);
    expect(r2.estado).toBe('RECIBIDA');
    expect(fila('orden_items', 100).cantidad_recibida).toBe(10);
  });

  it('sin items recibe todo lo pendiente', async () => {
    tabla('orden_items')[0].cantidad_recibida = 3;
    const r = await recepcion.recibir(10, null, ctx);
    expect(r.recibidos).toEqual([{ producto_id: 1, cantidad: 7, costo_unitario: 1000 }]);
    expect(r.estado).toBe('RECIBIDA');
  });

  it('acepta 0 en una línea (no llegó) si otra línea trae cantidad', async () => {
    tabla('orden_items').push({ id: 101, orden_id: 10, producto_id: 2, cantidad: 3, cantidad_recibida: 0, costo_unitario: 500 });
    const r = await recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 0 }, { item_id: 101, cantidad_recibida: 3 }], ctx);
    expect(r.recibidos).toEqual([{ producto_id: 2, cantidad: 3, costo_unitario: 500 }]);
    expect(r.estado).toBe('RECIBIDA_PARCIAL');
  });
});

describe('validaciones', () => {
  beforeEach(() => escenario());

  it('cantidad mayor que lo pendiente -> 400 CANTIDAD_EXCEDE_PENDIENTE y no escribe nada', async () => {
    tabla('orden_items')[0].cantidad_recibida = 8;
    await expect(recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 3 }], ctx))
      .rejects.toMatchObject({ code: 'CANTIDAD_EXCEDE_PENDIENTE', httpStatus: 400, details: { pendiente: 2 } });
    expect(tabla('movimientos')).toHaveLength(0);
    expect(fila('productos', 1).stock).toBe(0);
  });

  it('todo en 0 -> 400 SIN_CANTIDADES', async () => {
    await expect(recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 0 }], ctx)).rejects.toMatchObject({ code: 'SIN_CANTIDADES' });
  });

  it('item de otra orden -> 400 ITEM_NO_PERTENECE', async () => {
    await expect(recepcion.recibir(10, [{ item_id: 999, cantidad_recibida: 1 }], ctx)).rejects.toMatchObject({ code: 'ITEM_NO_PERTENECE' });
  });

  it.each(['BORRADOR', 'RECIBIDA', 'ANULADA'])('orden %s -> 409 ORDEN_NO_RECIBIBLE', async (estado) => {
    tabla('ordenes')[0].estado = estado;
    await expect(recepcion.recibir(10, null, ctx)).rejects.toMatchObject({ code: 'ORDEN_NO_RECIBIBLE', httpStatus: 409 });
  });

  it('orden inexistente -> 404', async () => {
    await expect(recepcion.recibir(77, null, ctx)).rejects.toMatchObject({ httpStatus: 404 });
  });
});

describe('orden de locks y concurrencia', () => {
  it('bloquea orden -> solicitudes (id ASC) -> productos (id ASC), igual que anular (solicitud -> productos)', async () => {
    escenario();
    await recepcion.recibir(10, null, ctx);
    const claves = bd.historialLocks.map((l) => l.clave);
    expect(claves).toEqual(['ordenes:10', 'solicitudes:1', 'solicitudes:2', 'solicitudes:3', 'productos:1']);
  });

  it('auditoría de la recepción y de cada solicitud completada, en la misma transacción', async () => {
    escenario();
    await recepcion.recibir(10, null, ctx);
    const aud = tabla('auditoria');
    // Solicitudes 1 y 2 se completan; la 3 queda PARCIAL (sin auditoría de asignación completa).
    expect(aud.map((a) => a.accion)).toEqual(['ASIGNACION_RECEPCION', 'ASIGNACION_RECEPCION', 'RECEPCION']);
    expect(new Set(aud.map((a) => a.tx)).size).toBe(1);
  });

  // Falla si las transacciones no terminan (deadlock); limpia su temporizador para no dejar handles abiertos.
  async function sinDeadlock(promesa) {
    let temporizador;
    const plazo = new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error('DEADLOCK: las transacciones no terminaron')), 2000); });
    try { return await Promise.race([promesa, plazo]); } finally { clearTimeout(temporizador); }
  }

  // Recepción y anulación de la misma solicitud al mismo tiempo, con el código real de ambos servicios.
  // Si el orden de locks fuera distinto, se bloquearían mutuamente y el test fallaría por tiempo (deadlock).
  it.each([['la recepción arranca primero', true], ['la anulación arranca primero', false]])('recepción vs anulación (%s): sin deadlock, sin stock negativo, stock = Σ movimientos', async (_, recepcionPrimero) => {
    escenario({
      solicitudes: [{ id: 1, estado: 'PARCIAL', centro_costo_id: 3, trabajador_id: 4, usuario_id: null }],
      items: [{ id: 1, solicitud_id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 0, cantidad_faltante: 5 }],
      orden_items: [{ id: 100, orden_id: 10, producto_id: 1, cantidad: 5, cantidad_recibida: 0, costo_unitario: 1000 }]
    });
    const recibir = () => recepcion.recibir(10, null, ctx);
    const anular = () => solicitudes.anular(1, 'prueba concurrencia', ADMIN, '::1');
    await sinDeadlock(recepcionPrimero ? Promise.all([recibir(), anular()]) : Promise.all([anular(), recibir()]));

    const producto = fila('productos', 1);
    const suma = tabla('movimientos').filter((m) => m.producto_id === 1).reduce((a, m) => a + m.cantidad, 0);
    expect(fila('solicitudes', 1).estado).toBe('ANULADA');
    expect(producto.stock).toBeGreaterThanOrEqual(0);
    expect(producto.stock).toBe(suma);
    // Lo recibido (5) termina libre en bodega en cualquier orden: o nunca se asignó, o se asignó y la anulación lo repuso.
    expect(producto.stock).toBe(5);
    expect(bd.locks.size).toBe(0);
  });

  // Dos recepciones de la misma orden a la vez: el lock de la orden las pone en fila; la segunda ve lo que
  // dejó la primera y no puede pasarse de lo pedido.
  it('recepción vs recepción de la misma orden: se serializan y nunca se recibe más de lo pedido', async () => {
    escenario({
      solicitudes: [{ id: 1, estado: 'PARCIAL', centro_costo_id: 3, trabajador_id: 4, usuario_id: null }],
      items: [{ id: 1, solicitud_id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 0, cantidad_faltante: 5 }],
      orden_items: [{ id: 100, orden_id: 10, producto_id: 1, cantidad: 6, cantidad_recibida: 0, costo_unitario: 1000 }]
    });
    const r = await sinDeadlock(Promise.allSettled([
      recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 4 }], ctx),
      recepcion.recibir(10, [{ item_id: 100, cantidad_recibida: 4 }], ctx)
    ]));
    // 4 + 4 > 6: una entra y la otra se rechaza por exceder lo pendiente (2).
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.filter((x) => x.status === 'rejected')[0].reason).toMatchObject({ code: 'CANTIDAD_EXCEDE_PENDIENTE', details: { pendiente: 2 } });
    expect(fila('orden_items', 100).cantidad_recibida).toBe(4);
    expect(tabla('ordenes')[0].estado).toBe('RECIBIDA_PARCIAL');
    const suma = tabla('movimientos').filter((m) => m.producto_id === 1).reduce((a, m) => a + m.cantidad, 0);
    expect(fila('productos', 1).stock).toBe(suma);
    expect(bd.locks.size).toBe(0);
  });
});
