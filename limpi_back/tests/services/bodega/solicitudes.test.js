/**
 * RF-BOD-01 — services/bodega/solicitudes.js con modelos simulados en memoria (sin BD).
 * Foco: propiedad por contexto (trabajador_id vs usuario_id, nunca se cruzan), reglas de estado y auditoría.
 */
// Transacción simulada única para poder comprobar que el bloqueo y la auditoría usan la misma.
const mockTransaccion = { id: 'tx-prueba', LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn(async (fn) => fn(mockTransaccion)) }
}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const mem = { solicitudes: [], items: [], productos: [], centros: [], asignaciones: [] };

function instancia(fila) {
  return Object.assign({}, fila, {
    get: () => Object.assign({}, fila),
    update: jest.fn(async function (cambios) { Object.assign(fila, cambios); Object.assign(this, cambios); return this; })
  });
}
const coincide = (fila, where) => Object.keys(where || {}).every((k) => {
  const v = where[k];
  if (v && typeof v === 'object') {
    const lista = Object.getOwnPropertySymbols(v).map((s) => v[s])[0];
    return Array.isArray(lista) ? lista.indexOf(fila[k]) !== -1 : true;
  }
  return fila[k] === v;
});
const tabla = (nombre) => ({
  findAll: jest.fn(async (o) => mem[nombre].filter((f) => coincide(f, o && o.where)).map(instancia)),
  findById: jest.fn(async (id) => { const f = mem[nombre].find((x) => x.id === Number(id)); return f ? instancia(f) : null; })
});

jest.mock('../../../modelos/sistema_bodega/Solicitud_bodega', () => ({}));
jest.mock('../../../modelos/sistema_bodega/Solicitud_item', () => ({}));
jest.mock('../../../modelos/sistema_base/Producto', () => ({}));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({}));
jest.mock('../../../modelos/sistema_base/Centro_costo_trabajadore', () => ({}));
jest.mock('../../../modelos/sistema_base/Cliente', () => ({ findAll: jest.fn(async () => []) }));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({ findAll: jest.fn(async () => [{ id: 7, nombre: 'Sup', apellido: 'Uno' }]) }));
jest.mock('../../../modelos/sistema_base/Usuario', () => ({ findAll: jest.fn(async () => [{ id: 7, nombre: 'Admin', apellido: 'Siete' }]) }));

const Solicitud = require('../../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../../modelos/sistema_bodega/Solicitud_item');
const Producto = require('../../../modelos/sistema_base/Producto');
const Centro = require('../../../modelos/sistema_base/Centro_costo');
const CentroTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const { auditar } = require('../../../services/auditoria');

Object.assign(Solicitud, tabla('solicitudes'), {
  create: jest.fn(async (datos) => {
    const fila = Object.assign({ id: mem.solicitudes.length + 1, trabajador_id: null, usuario_id: null, created_at: new Date(), anulada_at: null, entregada_at: null }, datos);
    mem.solicitudes.push(fila);
    return instancia(fila);
  }),
  findAndCountAll: jest.fn(async (o) => {
    const filas = mem.solicitudes.filter((f) => coincide(f, o.where));
    return { count: filas.length, rows: filas.slice(o.offset, o.offset + o.limit).map(instancia) };
  })
});
Object.assign(Item, tabla('items'), {
  create: jest.fn(async (datos) => {
    const fila = Object.assign({ id: mem.items.length + 1, cantidad_asignada: 0, cantidad_faltante: null }, datos);
    mem.items.push(fila);
    return instancia(fila);
  })
});
Object.assign(Producto, tabla('productos'));
Object.assign(Centro, tabla('centros'));
Object.assign(CentroTrabajador, tabla('asignaciones'));

const servicio = require('../../../services/bodega/solicitudes');

// Mismo número 7 en dos tablas distintas: es el caso que no debe confundirse.
const SUPERVISOR = { id: 7, contexto: 'acceso_trabajadores' };
const OTRO_SUPERVISOR = { id: 8, contexto: 'acceso_trabajadores' };
const ADMIN = { id: 7, contexto: 'usuarios', rol_nombre: 'Administrador' };

beforeEach(() => {
  jest.clearAllMocks();
  mem.solicitudes = [];
  mem.items = [];
  mem.productos = [{ id: 1, nombre: 'Guantes', estado: 1 }, { id: 2, nombre: 'Cloro', estado: 1 }, { id: 3, nombre: 'Viejo', estado: 0 }];
  mem.centros = [{ id: 10, numero_cc: 100, estado: 1, clienteId: null }, { id: 11, numero_cc: 101, estado: 1, clienteId: null }, { id: 12, numero_cc: 102, estado: 0, clienteId: null }];
  mem.asignaciones = [{ id: 1, trabajadoreId: 7, centroCostoId: 10 }, { id: 2, trabajadoreId: 8, centroCostoId: 11 }];
});

const entrada = (extra) => Object.assign({ centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 12 }, { producto_id: 2, cantidad: 5 }], observacion: null }, extra || {});

describe('crear', () => {
  it('supervisor: guarda trabajador_id (no usuario_id), PENDIENTE, ítems y auditoría CREAR', async () => {
    const s = await servicio.crear(entrada(), SUPERVISOR, '::1');
    expect(mem.solicitudes[0]).toMatchObject({ trabajador_id: 7, usuario_id: null, estado: 'PENDIENTE', centro_costo_id: 10 });
    expect(mem.items).toHaveLength(2);
    expect(s.etiqueta_estado).toBe('Pendiente');
    expect(s.solicitante).toMatchObject({ tipo: 'supervisor', id: 7 });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CREAR', entidad: 'solicitudes_bodega', usuario: { id: 7, contexto: 'acceso_trabajadores' } }));
  });

  it('admin: guarda usuario_id (no trabajador_id) y puede usar cualquier centro abierto', async () => {
    await servicio.crear(entrada({ centro_costo_id: 11 }), ADMIN, '::1');
    expect(mem.solicitudes[0]).toMatchObject({ trabajador_id: null, usuario_id: 7, centro_costo_id: 11 });
  });

  it('supervisor con centro no asignado -> 403 CENTRO_NO_PERMITIDO', async () => {
    await expect(servicio.crear(entrada({ centro_costo_id: 11 }), SUPERVISOR)).rejects.toMatchObject({ code: 'CENTRO_NO_PERMITIDO', httpStatus: 403 });
    expect(mem.solicitudes).toHaveLength(0);
  });

  it('centro cerrado o inexistente -> 400 CENTRO_NO_DISPONIBLE', async () => {
    await expect(servicio.crear(entrada({ centro_costo_id: 12 }), ADMIN)).rejects.toMatchObject({ code: 'CENTRO_NO_DISPONIBLE' });
    await expect(servicio.crear(entrada({ centro_costo_id: 999 }), ADMIN)).rejects.toMatchObject({ code: 'CENTRO_NO_DISPONIBLE' });
  });

  it('producto inactivo o inexistente -> 400 PRODUCTO_NO_SOLICITABLE con los ids', async () => {
    const e = entrada({ items: [{ producto_id: 1, cantidad: 1 }, { producto_id: 3, cantidad: 1 }, { producto_id: 99, cantidad: 1 }] });
    await expect(servicio.crear(e, SUPERVISOR)).rejects.toMatchObject({ code: 'PRODUCTO_NO_SOLICITABLE', details: { producto_ids: [3, 99] } });
  });
});

describe('propiedad por contexto', () => {
  it('esDueno nunca cruza contextos aunque el número de id sea el mismo', () => {
    expect(servicio.esDueno({ trabajador_id: null, usuario_id: 7 }, SUPERVISOR)).toBe(false);
    expect(servicio.esDueno({ trabajador_id: 7, usuario_id: null }, ADMIN)).toBe(false);
    expect(servicio.esDueno({ trabajador_id: 7, usuario_id: null }, SUPERVISOR)).toBe(true);
  });

  it('un supervisor no ve la solicitud de otro supervisor (404, no revela que existe)', async () => {
    await servicio.crear(entrada({ centro_costo_id: 11 }), OTRO_SUPERVISOR);
    await expect(servicio.obtener(1, SUPERVISOR)).rejects.toMatchObject({ code: 'SOLICITUD_NO_EXISTE', httpStatus: 404 });
  });

  it('un supervisor (trabajador 7) no ve la creada por el usuario admin 7', async () => {
    await servicio.crear(entrada(), ADMIN);
    await expect(servicio.obtener(1, SUPERVISOR)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(servicio.anular(1, null, SUPERVISOR)).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('mias filtra por la columna del propio contexto', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    await servicio.crear(entrada(), ADMIN);
    const delSupervisor = await servicio.listarMias({ page: 1, limit: 20 }, SUPERVISOR);
    const delAdmin = await servicio.listarMias({ page: 1, limit: 20 }, ADMIN);
    expect(delSupervisor.data.map((s) => s.id)).toEqual([1]);
    expect(delAdmin.data.map((s) => s.id)).toEqual([2]);
    expect(Solicitud.findAndCountAll.mock.calls[0][0].where).toEqual({ trabajador_id: 7 });
    expect(Solicitud.findAndCountAll.mock.calls[1][0].where).toEqual({ usuario_id: 7 });
  });

  it('el admin ve cualquier solicitud; el supervisor no ve asignado/faltante (regla 6)', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    const vistaAdmin = await servicio.obtener(1, ADMIN);
    const vistaSupervisor = await servicio.obtener(1, SUPERVISOR);
    expect(vistaAdmin.items[0]).toHaveProperty('cantidad_asignada', 0);
    expect(vistaSupervisor.items[0]).not.toHaveProperty('cantidad_asignada');
    expect(vistaSupervisor.items[0]).not.toHaveProperty('cantidad_faltante');
    expect(vistaSupervisor.items[0]).toMatchObject({ producto: 'Guantes', cantidad_pedida: 12 });
  });
});

describe('listar (admin)', () => {
  it('filtra por estado y pagina con meta', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    await servicio.crear(entrada(), ADMIN);
    mem.solicitudes[1].estado = 'PARCIAL';
    const r = await servicio.listar({ page: 1, limit: 1, estados: ['PARCIAL', 'LISTA_ENTREGA'] }, ADMIN);
    expect(r.meta).toEqual({ page: 1, limit: 1, total: 1 });
    expect(r.data[0]).toMatchObject({ id: 2, etiqueta_estado: 'En proceso', total_items: 2 });
  });
});

describe('anular', () => {
  it('supervisor anula la propia en PENDIENTE y queda auditado con motivo', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    const s = await servicio.anular(1, 'ya no se necesita', SUPERVISOR, '::1');
    expect(s.estado).toBe('ANULADA');
    expect(mem.solicitudes[0].anulada_at).toBeInstanceOf(Date);
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({ accion: 'ANULAR', motivo: 'ya no se necesita' }));
  });

  it('bloquea la fila (LOCK.UPDATE) y audita dentro de la misma transacción', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    await servicio.anular(1, null, SUPERVISOR);
    expect(Solicitud.findById).toHaveBeenCalledWith(1, expect.objectContaining({ lock: 'UPDATE', transaction: mockTransaccion }));
    auditar.mock.calls.forEach((llamada) => expect(llamada[0].transaction).toBe(mockTransaccion));
    expect(auditar).toHaveBeenCalledTimes(2);
  });

  it('supervisor no puede anular si ya no está PENDIENTE -> 409', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    mem.solicitudes[0].estado = 'PARCIAL';
    await expect(servicio.anular(1, null, SUPERVISOR)).rejects.toMatchObject({ code: 'ESTADO_NO_PERMITE_ANULAR', httpStatus: 409 });
  });

  it('admin anula una en proceso, pero no una ENTREGADA', async () => {
    await servicio.crear(entrada(), SUPERVISOR);
    await servicio.crear(entrada(), SUPERVISOR);
    mem.solicitudes[0].estado = 'LISTA_ENTREGA';
    mem.solicitudes[1].estado = 'ENTREGADA';
    await expect(servicio.anular(1, null, ADMIN)).resolves.toMatchObject({ estado: 'ANULADA' });
    await expect(servicio.anular(2, null, ADMIN)).rejects.toMatchObject({ httpStatus: 409 });
  });
});

describe('sin cambio de estado manual en RF-BOD-01', () => {
  it('el servicio no expone cambiarEstado', () => {
    expect(servicio.cambiarEstado).toBeUndefined();
  });
});
