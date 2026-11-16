/**
 * RF-PEV-02a — services/pev/actividades.js con modelos simulados en memoria (sin BD).
 * Foco: creación de la actividad con sus 3 pasos por defecto en la misma transacción, duplicados
 * (pre-check + respaldo del UNIQUE uq_actividades_cliente_nombre) y validaciones.
 */
const mockTransaccion = { id: 'tx-prueba', LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../../database/database', () => ({
  sequelize: {
    transaction: jest.fn(async (a, b) => (typeof a === 'function' ? a : b)(mockTransaccion)),
    define: jest.fn(() => {
      const m = {};
      ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'].forEach((metodo) => { m[metodo] = jest.fn(() => m); });
      return m;
    }),
    query: jest.fn()
  }
}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const mem = { actividades: [], pasos: [], clientes: [] };
const ids = {};

function instancia(fila) {
  return Object.assign({}, fila, { get: () => Object.assign({}, fila) });
}

jest.mock('../../../modelos/apartado_listas_pev/actividad', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/actividadPaso', () => ({}));
jest.mock('../../../modelos/sistema_base/Cliente', () => ({}));

const Actividad = require('../../../modelos/apartado_listas_pev/actividad');
const ActividadPaso = require('../../../modelos/apartado_listas_pev/actividadPaso');
const Cliente = require('../../../modelos/sistema_base/Cliente');
const { auditar } = require('../../../services/auditoria');

Object.assign(Actividad, {
  findById: jest.fn(async (id) => { const f = mem.actividades.find((x) => x.id === Number(id)); return f ? instancia(f) : null; }),
  findOne: jest.fn(async (o) => {
    const f = mem.actividades.find((x) => x.cliente_id === o.where.cliente_id && x.nombre === o.where.nombre);
    return f ? instancia(f) : null;
  }),
  create: jest.fn(async (datos) => {
    if (mem.actividades.some((x) => x.cliente_id === datos.cliente_id && x.nombre === datos.nombre)) {
      const err = new Error('Duplicate entry for key uq_actividades_cliente_nombre');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    }
    ids.actividades = (ids.actividades || 0) + 1;
    const fila = Object.assign({ id: ids.actividades, estado: 1, origen: 'APP', created_at: new Date(), updated_at: new Date() }, datos);
    mem.actividades.push(fila);
    return instancia(fila);
  })
});
Object.assign(ActividadPaso, {
  create: jest.fn(async (datos) => {
    ids.pasos = (ids.pasos || 0) + 1;
    const fila = Object.assign({ id: ids.pasos, estado: 1 }, datos);
    mem.pasos.push(fila);
    return instancia(fila);
  })
});
Object.assign(Cliente, {
  findById: jest.fn(async (id) => { const f = mem.clientes.find((x) => x.id === Number(id)); return f ? instancia(f) : null; })
});

const servicio = require('../../../services/pev/actividades');

const CTX = { usuario: { id: 7, contexto: 'usuarios' }, ip: '127.0.0.1' };

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mem).forEach((k) => { mem[k] = []; });
  Object.keys(ids).forEach((k) => delete ids[k]);
  mem.clientes.push({ id: 10, nombre: 'Cliente SPA' });
});

describe('crear actividad', () => {
  it('camino feliz: crea la actividad con los 3 pasos por defecto en orden y audita CREAR', async () => {
    const creada = await servicio.crear({ cliente_id: 10, nombre: '  Pulido de pisos  ' }, CTX);
    expect(creada).toMatchObject({ cliente_id: 10, nombre: 'Pulido de pisos', estado: 1, origen: 'APP', created_by: 7 });
    expect(creada.pasos.map((p) => [p.orden, p.nombre, p.columna_legacy])).toEqual([
      [1, 'Despolvado', 'despolvado'],
      [2, 'Aplicación de producto', 'aplicacion_producto'],
      [3, 'Abrillantado', 'abrillantado']
    ]);
    expect(mem.pasos.every((p) => p.actividad_id === creada.id && p.estado === 1)).toBe(true);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockTransaccion, entidad: 'actividades', entidad_id: creada.id, accion: 'CREAR', antes: null
    }));
  });

  it('duplicada (cliente_id, nombre): pre-check 409 ACTIVIDAD_DUPLICADA y no crea pasos', async () => {
    await servicio.crear({ cliente_id: 10, nombre: 'Pulido de pisos' }, CTX);
    await expect(servicio.crear({ cliente_id: 10, nombre: 'Pulido de pisos' }, CTX))
      .rejects.toMatchObject({ code: 'ACTIVIDAD_DUPLICADA', httpStatus: 409 });
    expect(mem.actividades.length).toBe(1);
    expect(mem.pasos.length).toBe(3);
  });

  it('respaldo del UNIQUE: un UniqueConstraintError del INSERT se traduce a 409 ACTIVIDAD_DUPLICADA', async () => {
    Actividad.create.mockImplementationOnce(async () => {
      const err = new Error('Duplicate entry');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    });
    await expect(servicio.crear({ cliente_id: 10, nombre: 'Nueva' }, CTX))
      .rejects.toMatchObject({ code: 'ACTIVIDAD_DUPLICADA', httpStatus: 409 });
  });

  it('cliente inexistente: 404 CLIENTE_NO_EXISTE', async () => {
    await expect(servicio.crear({ cliente_id: 99, nombre: 'X' }, CTX))
      .rejects.toMatchObject({ code: 'CLIENTE_NO_EXISTE', httpStatus: 404 });
  });

  it('nombre vacío o > 100 caracteres: 400 CAMPO_INVALIDO sin tocar la BD', async () => {
    await expect(servicio.crear({ cliente_id: 10, nombre: '   ' }, CTX))
      .rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    await expect(servicio.crear({ cliente_id: 10, nombre: 'x'.repeat(101) }, CTX))
      .rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    expect(mem.actividades.length).toBe(0);
  });
});
