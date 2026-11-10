/**
 * RF-BOD-04 — services/bodega/entrega.js sobre la BD en memoria (tests/helpers).
 * Clave: entregar registra el consumo en el centro de costo SIN volver a descontar stock.
 */
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
jest.mock('../../../modelos/sistema_base/Lista_insumo', () => require('../../helpers/bd-memoria-bodega').modelo('listas'));
jest.mock('../../../modelos/sistema_base/Linea_insumo', () => require('../../helpers/bd-memoria-bodega').modelo('lineas'));
jest.mock('../../../modelos/sistema_base/Auditoria', () => require('../../helpers/bd-memoria-bodega').modelo('auditoria'));

const { reiniciar, tabla } = require('../../helpers/bd-memoria-bodega');
const entrega = require('../../../services/bodega/entrega');

const ADMIN = { id: 1, contexto: 'usuarios', rol_nombre: 'Administrador' };
const SUPERVISOR = { id: 4, contexto: 'acceso_trabajadores' };

function escenario() {
  reiniciar({
    productos: [
      { id: 1, nombre: 'Guantes', estado: 1, stock: 20, costo_unitario: 900, precio: 1500 },
      { id: 2, nombre: 'Cloro', estado: 1, stock: 7, costo_unitario: null, precio: 800 },
      { id: 3, nombre: 'Mascarilla', estado: 1, stock: 2, costo_unitario: null, precio: null }
    ],
    solicitudes: [{ id: 1, estado: 'LISTA_ENTREGA', centro_costo_id: 3, trabajador_id: 4, usuario_id: null, observacion: 'urgente', lista_insumo_id: null }],
    items: [
      { id: 1, solicitud_id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 5, cantidad_faltante: 0 },
      { id: 2, solicitud_id: 1, producto_id: 2, cantidad_pedida: 3, cantidad_asignada: 3, cantidad_faltante: 0 }
    ],
    centros: [{ id: 3, numero_cc: 1, estado: 1, clienteId: null }],
    usuarios: [{ id: 1, nombre: 'Admin', apellido: 'Limpiecito' }],
    trabajadores: [{ id: 4, nombre: 'Sup', apellido: 'Prueba' }],
    movimientos: [], listas: [], lineas: [], auditoria: []
  });
}
const fila = (t, id) => tabla(t).filter((f) => f.id === id)[0];

describe('entregar', () => {
  beforeEach(escenario);

  it('registra el consumo en el centro de costo con una lista aprobada y pasa a ENTREGADA', async () => {
    const s = await entrega.entregar(1, ADMIN, '::1');
    expect(s.estado).toBe('ENTREGADA');
    const lista = tabla('listas')[0];
    expect(lista).toMatchObject({ estado: 1, centroCostoId: 3, usuarioCreaId: 1, usuarioApruebaId: 1, total: 5 * 900 + 3 * 800 });
    expect(tabla('lineas')).toEqual([
      expect.objectContaining({ productoId: 1, cantidad: 5, precio: 900, total_linea: 4500, listaInsumoId: lista.id }),
      expect.objectContaining({ productoId: 2, cantidad: 3, precio: 800, total_linea: 2400, listaInsumoId: lista.id })
    ]);
    expect(fila('solicitudes', 1)).toMatchObject({ estado: 'ENTREGADA', lista_insumo_id: lista.id });
    expect(fila('solicitudes', 1).entregada_at).toBeInstanceOf(Date);
    expect(tabla('auditoria').map((a) => a.accion)).toEqual(['ENTREGA']);
  });

  it('NO vuelve a descontar stock ni crea movimientos (ya se descontó en el cruce/recepción)', async () => {
    await entrega.entregar(1, ADMIN);
    expect(fila('productos', 1).stock).toBe(20);
    expect(fila('productos', 2).stock).toBe(7);
    expect(tabla('movimientos')).toHaveLength(0);
  });

  it('una segunda entrega -> 409 y sigue habiendo una sola lista', async () => {
    await entrega.entregar(1, ADMIN);
    await expect(entrega.entregar(1, ADMIN)).rejects.toMatchObject({ code: 'ESTADO_NO_PERMITE_ENTREGA', httpStatus: 409 });
    expect(tabla('listas')).toHaveLength(1);
  });

  it('dos entregas simultáneas: solo una registra consumo (lock sobre la solicitud)', async () => {
    const r = await Promise.allSettled([entrega.entregar(1, ADMIN), entrega.entregar(1, ADMIN)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(r.filter((x) => x.status === 'rejected')[0].reason).toMatchObject({ httpStatus: 409 });
    expect(tabla('listas')).toHaveLength(1);
    expect(tabla('lineas')).toHaveLength(2);
  });

  it('con lista ya vinculada (defensivo) -> 409 YA_ENTREGADA', async () => {
    fila('solicitudes', 1).lista_insumo_id = 99;
    await expect(entrega.entregar(1, ADMIN)).rejects.toMatchObject({ code: 'YA_ENTREGADA' });
  });

  it.each(['PENDIENTE', 'PARCIAL', 'ANULADA'])('en estado %s -> 409', async (estado) => {
    fila('solicitudes', 1).estado = estado;
    await expect(entrega.entregar(1, ADMIN)).rejects.toMatchObject({ code: 'ESTADO_NO_PERMITE_ENTREGA' });
  });

  it('centro de costo cerrado -> 409 CENTRO_CERRADO sin crear lista', async () => {
    fila('centros', 3).estado = 0;
    await expect(entrega.entregar(1, ADMIN)).rejects.toMatchObject({ code: 'CENTRO_CERRADO' });
    expect(tabla('listas')).toHaveLength(0);
  });

  it('un supervisor no registra entregas (Lista_insumo.usuarioCreaId es FK a usuarios) -> 403', async () => {
    await expect(entrega.entregar(1, SUPERVISOR)).rejects.toMatchObject({ httpStatus: 403 });
  });
});

describe('formato de entrega', () => {
  beforeEach(escenario);

  it('vista previa (LISTA_ENTREGA): marca "costo estimado" cuando el costo sale de productos.precio', async () => {
    const f = await entrega.formatoEntrega(1, ADMIN);
    expect(f).toMatchObject({ empresa: 'Aseo Limpiecito', numero: 1, vista_previa: true, total: 6900, hay_costo_estimado: true, hay_sin_costo: false });
    expect(f.items).toEqual([
      { producto: 'Guantes', cantidad: 5, precio_unitario: 900, total: 4500, costo_estimado: false, sin_costo: false },
      { producto: 'Cloro', cantidad: 3, precio_unitario: 800, total: 2400, costo_estimado: true, sin_costo: false }
    ]);
  });

  it('producto sin costo ni precio: precio 0 marcado "sin costo"', async () => {
    tabla('items').push({ id: 3, solicitud_id: 1, producto_id: 3, cantidad_pedida: 2, cantidad_asignada: 2, cantidad_faltante: 0 });
    const f = await entrega.formatoEntrega(1, ADMIN);
    expect(f.items[2]).toMatchObject({ producto: 'Mascarilla', precio_unitario: 0, sin_costo: true });
    expect(f.hay_sin_costo).toBe(true);
  });

  it('ENTREGADA: muestra lo registrado al entregar (no cambia si después cambia el costo) y quién entregó', async () => {
    await entrega.entregar(1, ADMIN);
    fila('productos', 1).costo_unitario = 5000;
    const f = await entrega.formatoEntrega(1, ADMIN);
    expect(f).toMatchObject({ vista_previa: false, entregado_por: 'Admin Limpiecito', total: 6900, hay_costo_estimado: true });
    expect(f.items[0].precio_unitario).toBe(900);
  });

  it('en PENDIENTE no hay formato -> 409', async () => {
    fila('solicitudes', 1).estado = 'PENDIENTE';
    await expect(entrega.formatoEntrega(1, ADMIN)).rejects.toMatchObject({ code: 'ESTADO_SIN_FORMATO' });
  });
});
