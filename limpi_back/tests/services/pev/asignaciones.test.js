/**
 * RF-PEV-02a — services/pev/asignaciones.js con modelos simulados en memoria (sin BD).
 * Foco: unicidad de asignaciones ACTIVAS (pre-check + respaldo del UNIQUE uq_asig_activa),
 * vigencias solapadas, cierre/anulación SIN borrado físico (definición intacta), tarea puente
 * (D-105) y auditoría en la misma transacción. Patrón: tests/services/bodega/solicitudes.test.js.
 */
const mockTransaccion = { id: 'tx-prueba', LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../../database/database', () => ({
  sequelize: {
    transaction: jest.fn(async (a, b) => (typeof a === 'function' ? a : b)(mockTransaccion)),
    // cierre.js (reintentarTransaccion) arrastra modelos que llaman define() al cargar el módulo.
    define: jest.fn(() => {
      const m = {};
      ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'].forEach((metodo) => { m[metodo] = jest.fn(() => m); });
      return m;
    }),
    query: jest.fn(async () => [{ total: 0 }]) // tieneHistorial(): sin líneas por defecto
  }
}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const mem = {
  actividades: [], asignaciones: [], areas: [], sectores: [],
  turnos: [], trabajadores: [], tareas: [], turnos_tareas: []
};
const ids = {};

function siguienteId(nombre) {
  ids[nombre] = (ids[nombre] || 0) + 1;
  return ids[nombre];
}

function instancia(fila) {
  return Object.assign({}, fila, {
    get: () => Object.assign({}, fila),
    update: jest.fn(async function (cambios) { Object.assign(fila, cambios); Object.assign(this, cambios); return this; })
  });
}

const coincide = (fila, where) => Object.keys(where || {}).every((k) => fila[k] === where[k]);
const tablaSimple = (nombre) => ({
  findById: jest.fn(async (id) => { const f = mem[nombre].find((x) => x.id === Number(id)); return f ? instancia(f) : null; }),
  findOne: jest.fn(async (o) => { const f = mem[nombre].filter((x) => coincide(x, o && o.where)).sort((a, b) => a.id - b.id)[0]; return f ? instancia(f) : null; })
});

jest.mock('../../../modelos/apartado_listas_pev/actividad', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/actividadAsignacion', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/area', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/sector', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/turno', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/tarea', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/turnoTarea', () => ({}));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({}));

const Actividad = require('../../../modelos/apartado_listas_pev/actividad');
const Asignacion = require('../../../modelos/apartado_listas_pev/actividadAsignacion');
const Area = require('../../../modelos/apartado_listas_pev/area');
const Sector = require('../../../modelos/apartado_listas_pev/sector');
const Turno = require('../../../modelos/apartado_listas_pev/turno');
const Tarea = require('../../../modelos/apartado_listas_pev/tarea');
const TurnoTarea = require('../../../modelos/apartado_listas_pev/turnoTarea');
const Trabajadore = require('../../../modelos/sistema_base/Trabajadore');
const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');

Object.assign(Actividad, tablaSimple('actividades'));
Object.assign(Area, tablaSimple('areas'));
Object.assign(Sector, tablaSimple('sectores'));
Object.assign(Turno, tablaSimple('turnos'));
Object.assign(Trabajadore, tablaSimple('trabajadores'));
Object.assign(Tarea, tablaSimple('tareas'), {
  create: jest.fn(async (datos) => {
    const fila = Object.assign({ id: siguienteId('tareas'), estado: 1, actividadId: null }, datos);
    mem.tareas.push(fila);
    return instancia(fila);
  })
});
Object.assign(TurnoTarea, tablaSimple('turnos_tareas'), {
  create: jest.fn(async (datos) => {
    const fila = Object.assign({ id: siguienteId('turnos_tareas') }, datos);
    mem.turnos_tareas.push(fila);
    return instancia(fila);
  })
});

// La clave de negocio: (actividad, área, trabajador, turno). El UNIQUE uq_asig_activa se simula
// igual que MySQL: rechaza un INSERT con activa_flag = 1 si ya existe otra fila con la misma clave.
const CLAVES = ['actividad_id', 'area_id', 'trabajador_id', 'turno_id'];
const mismaClave = (a, b) => CLAVES.every((k) => a[k] === b[k]);
Object.assign(Asignacion, tablaSimple('asignaciones'), {
  findAll: jest.fn(async (o) => mem.asignaciones.filter((f) => coincide(f, o && o.where)).map(instancia)),
  create: jest.fn(async (datos) => {
    if (datos.activa_flag === 1 && mem.asignaciones.some((f) => f.activa_flag === 1 && mismaClave(f, datos))) {
      const err = new Error('Duplicate entry for key uq_asig_activa');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    }
    const fila = Object.assign({
      id: siguienteId('asignaciones'), fecha_hasta: null, motivo: null,
      cerrada_by: null, cerrada_at: null, created_at: new Date(), updated_at: new Date()
    }, datos);
    mem.asignaciones.push(fila);
    return instancia(fila);
  })
});

const servicio = require('../../../services/pev/asignaciones');

const CTX = { usuario: { id: 7, contexto: 'usuarios' }, ip: '127.0.0.1' };
const BASE = { actividad_id: 1, area_id: 2, trabajador_id: 4, turno_id: 3, fecha_desde: '2026-03-01' };

function sembrarDefinicion() {
  // Actividad con sus 3 pasos (dato plano: el servicio de asignaciones nunca debe tocarla).
  mem.actividades.push({
    id: 1, cliente_id: 10, nombre: 'Pulido de pisos', estado: 1, origen: 'APP', created_by: 7,
    pasos: [
      { id: 11, orden: 1, nombre: 'Despolvado' },
      { id: 12, orden: 2, nombre: 'Aplicación de producto' },
      { id: 13, orden: 3, nombre: 'Abrillantado' }
    ]
  });
  mem.areas.push({ id: 2, nombre: 'Lobby', sectoreId: 5 });
  mem.sectores.push({ id: 5, nombre: 'Piso 1', clienteId: 10 });
  mem.turnos.push({ id: 3, nombre: 'Mañana', clienteId: 10 });
  mem.trabajadores.push({ id: 4, nombre: 'Ana', apellido: 'Pérez' });
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mem).forEach((k) => { mem[k] = []; });
  Object.keys(ids).forEach((k) => delete ids[k]);
  db.sequelize.query.mockResolvedValue([{ total: 0 }]);
  sembrarDefinicion();
});

describe('crear asignación', () => {
  it('camino feliz: ACTIVA con activa_flag 1, tarea puente creada, turnos_tareas y auditoría CREAR', async () => {
    const creada = await servicio.crear(BASE, CTX);
    expect(creada).toMatchObject({
      actividad_id: 1, area_id: 2, trabajador_id: 4, turno_id: 3,
      fecha_desde: '2026-03-01', fecha_hasta: null, estado: 'ACTIVA', activa_flag: 1, origen: 'APP', created_by: 7
    });
    // Tarea puente (D-105 caso c): se crea con el nombre de la actividad, vinculada.
    expect(Tarea.create).toHaveBeenCalledTimes(1);
    expect(mem.tareas[0]).toMatchObject({ nombre: 'Pulido de pisos', areaId: 2, actividadId: 1, estado: 1 });
    expect(creada.tarea_id).toBe(mem.tareas[0].id);
    expect(mem.turnos_tareas).toEqual([expect.objectContaining({ turnoId: 3, tareaId: mem.tareas[0].id, estado: 1 })]);
    // Auditoría: CREAR de la asignación (y CREAR de la tarea puente) en la misma transacción.
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockTransaccion, entidad: 'actividad_asignaciones', entidad_id: creada.id, accion: 'CREAR', antes: null
    }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'tareas', accion: 'CREAR' }));
  });

  it('duplicada: una segunda ACTIVA con la misma clave falla 409 ASIGNACION_DUPLICADA', async () => {
    await servicio.crear(BASE, CTX);
    await expect(servicio.crear(BASE, CTX)).rejects.toMatchObject({ code: 'ASIGNACION_DUPLICADA', httpStatus: 409 });
    expect(mem.asignaciones.length).toBe(1);
  });

  it('respaldo del UNIQUE uq_asig_activa: un 1062/UniqueConstraintError del INSERT se traduce a 409 ASIGNACION_DUPLICADA', async () => {
    // El pre-check pasa (no hay filas), pero la BD rechaza el INSERT (carrera concurrente simulada).
    Asignacion.create.mockImplementationOnce(async () => {
      const err = new Error('Duplicate entry');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    });
    await expect(servicio.crear(BASE, CTX)).rejects.toMatchObject({ code: 'ASIGNACION_DUPLICADA', httpStatus: 409 });
  });

  it('vigencia solapada: una CERRADA que cubre fecha_desde falla 409 VIGENCIA_SOLAPADA', async () => {
    const primera = await servicio.crear(BASE, CTX);
    await servicio.cerrar(primera.id, { fecha_hasta: '2026-03-20' }, CTX);
    await expect(servicio.crear(Object.assign({}, BASE, { fecha_desde: '2026-03-10' }), CTX))
      .rejects.toMatchObject({ code: 'VIGENCIA_SOLAPADA', httpStatus: 409 });
    expect(mem.asignaciones.length).toBe(1);
  });

  it('validaciones: actividad inexistente 404, inactiva 409, turno de otro cliente 409, trabajador inexistente 404', async () => {
    await expect(servicio.crear(Object.assign({}, BASE, { actividad_id: 99 }), CTX))
      .rejects.toMatchObject({ code: 'ACTIVIDAD_NO_EXISTE', httpStatus: 404 });
    mem.actividades[0].estado = 0;
    await expect(servicio.crear(BASE, CTX)).rejects.toMatchObject({ code: 'ACTIVIDAD_INACTIVA', httpStatus: 409 });
    mem.actividades[0].estado = 1;
    mem.turnos[0].clienteId = 999;
    await expect(servicio.crear(BASE, CTX)).rejects.toMatchObject({ code: 'TURNO_CLIENTE_DISTINTO', httpStatus: 409 });
    mem.turnos[0].clienteId = 10;
    await expect(servicio.crear(Object.assign({}, BASE, { trabajador_id: 99 }), CTX))
      .rejects.toMatchObject({ code: 'TRABAJADOR_NO_EXISTE', httpStatus: 404 });
  });

  it('tarea_id de otra área falla 409 TAREA_INCOMPATIBLE', async () => {
    mem.tareas.push({ id: 50, nombre: 'Otra', areaId: 999, actividadId: null, estado: 1 });
    await expect(servicio.crear(Object.assign({}, BASE, { tarea_id: 50 }), CTX))
      .rejects.toMatchObject({ code: 'TAREA_INCOMPATIBLE', httpStatus: 409 });
  });

  it('D-105: reutiliza la tarea existente (actividadId+areaId) en vez de crear otra y no duplica turnos_tareas', async () => {
    mem.trabajadores.push({ id: 6, nombre: 'Beto', apellido: 'Ríos' });
    await servicio.crear(BASE, CTX);
    await servicio.crear(Object.assign({}, BASE, { trabajador_id: 6 }), CTX);
    expect(Tarea.create).toHaveBeenCalledTimes(1); // la 2da asignación reutiliza
    expect(mem.asignaciones[0].tarea_id).toBe(mem.asignaciones[1].tarea_id);
    expect(mem.turnos_tareas.length).toBe(1);
  });

  it('D-105 con tarea_id explícito sin vínculo: la enlaza a la actividad y audita EDITAR', async () => {
    mem.tareas.push({ id: 60, nombre: 'Tarea legacy', areaId: 2, actividadId: null, estado: 1 });
    const creada = await servicio.crear(Object.assign({}, BASE, { tarea_id: 60 }), CTX);
    expect(creada.tarea_id).toBe(60);
    expect(mem.tareas[0].actividadId).toBe(1);
    expect(Tarea.create).not.toHaveBeenCalled();
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'tareas', entidad_id: 60, accion: 'EDITAR' }));
  });

  it("D-105 (b'): sin tarea_id reutiliza la tarea legacy del área con el mismo nombre y la vincula", async () => {
    mem.tareas.push({ id: 70, nombre: 'Pulido de pisos', areaId: 2, actividadId: null, estado: 1 });
    mem.tareas.push({ id: 71, nombre: 'Pulido de pisos', areaId: 999, actividadId: null, estado: 1 });
    const creada = await servicio.crear(BASE, CTX);
    expect(creada.tarea_id).toBe(70);
    expect(mem.tareas.find((x) => x.id === 70).actividadId).toBe(1);
    expect(mem.tareas.find((x) => x.id === 71).actividadId).toBeNull();
    expect(Tarea.create).not.toHaveBeenCalled();
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'tareas', entidad_id: 70, accion: 'EDITAR' }));
  });
});

describe('cerrar asignación (sin borrado físico)', () => {
  it('camino feliz: CERRADA con fecha_hasta/cerrada_by/cerrada_at, activa_flag NULL, definición intacta y auditoría CIERRE', async () => {
    const creada = await servicio.crear(BASE, CTX);
    const pasosAntes = JSON.stringify(mem.actividades[0].pasos);
    const tareasAntes = JSON.stringify(mem.tareas);

    const cerrada = await servicio.cerrar(creada.id, { fecha_hasta: '2026-03-15', motivo: 'fin de contrato' }, CTX);
    expect(cerrada).toMatchObject({ estado: 'CERRADA', activa_flag: null, fecha_hasta: '2026-03-15', motivo: 'fin de contrato', cerrada_by: 7 });
    expect(cerrada.cerrada_at).toBeTruthy();

    // La fila sigue existiendo (sin DELETE) y la definición (actividad + 3 pasos + tarea puente) no cambió.
    expect(mem.asignaciones.length).toBe(1);
    expect(mem.asignaciones[0].estado).toBe('CERRADA');
    expect(JSON.stringify(mem.actividades[0].pasos)).toBe(pasosAntes);
    expect(mem.actividades[0].nombre).toBe('Pulido de pisos');
    expect(JSON.stringify(mem.tareas)).toBe(tareasAntes);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockTransaccion, entidad: 'actividad_asignaciones', entidad_id: creada.id, accion: 'CIERRE', motivo: 'fin de contrato'
    }));
  });

  it('tras cerrar se puede crear una nueva asignación idéntica (activa_flag volvió a NULL)', async () => {
    const primera = await servicio.crear(BASE, CTX);
    await servicio.cerrar(primera.id, { fecha_hasta: '2026-03-20' }, CTX);
    const segunda = await servicio.crear(Object.assign({}, BASE, { fecha_desde: '2026-03-21' }), CTX);
    expect(segunda.estado).toBe('ACTIVA');
    expect(mem.asignaciones.length).toBe(2);
  });

  it('errores: inexistente 404, no ACTIVA 409, fecha inválida (2026-02-31) 400, fecha_hasta < fecha_desde 400', async () => {
    await expect(servicio.cerrar(99, {}, CTX)).rejects.toMatchObject({ code: 'ASIGNACION_NO_EXISTE', httpStatus: 404 });
    const creada = await servicio.crear(BASE, CTX); // fecha_desde 2026-03-01
    await servicio.cerrar(creada.id, { fecha_hasta: '2026-03-10' }, CTX);
    await expect(servicio.cerrar(creada.id, {}, CTX)).rejects.toMatchObject({ code: 'ESTADO_INVALIDO', httpStatus: 409 });

    const otra = await servicio.crear(Object.assign({}, BASE, { fecha_desde: '2026-03-11' }), CTX);
    await expect(servicio.cerrar(otra.id, { fecha_hasta: '2026-02-31' }, CTX))
      .rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    await expect(servicio.cerrar(otra.id, { fecha_hasta: '2026-03-01' }, CTX))
      .rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
  });
});

describe('anular asignación (sin borrado físico)', () => {
  it('camino feliz: ANULADA con motivo/cerrada_by/cerrada_at, activa_flag NULL, definición intacta y auditoría ANULAR', async () => {
    const creada = await servicio.crear(BASE, CTX);
    const pasosAntes = JSON.stringify(mem.actividades[0].pasos);
    const tareasAntes = JSON.stringify(mem.tareas);

    const anulada = await servicio.anular(creada.id, { motivo: 'carga duplicada por error' }, CTX);
    expect(anulada).toMatchObject({ estado: 'ANULADA', activa_flag: null, motivo: 'carga duplicada por error', cerrada_by: 7 });
    expect(anulada.cerrada_at).toBeTruthy();
    expect(mem.asignaciones.length).toBe(1); // sin DELETE físico
    expect(JSON.stringify(mem.actividades[0].pasos)).toBe(pasosAntes);
    expect(JSON.stringify(mem.tareas)).toBe(tareasAntes);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockTransaccion, entidad: 'actividad_asignaciones', entidad_id: creada.id, accion: 'ANULAR', motivo: 'carga duplicada por error'
    }));
  });

  it('tras anular se puede crear una nueva asignación idéntica', async () => {
    const primera = await servicio.crear(BASE, CTX);
    await servicio.anular(primera.id, { motivo: 'carga duplicada por error' }, CTX);
    const segunda = await servicio.crear(BASE, CTX);
    expect(segunda.estado).toBe('ACTIVA');
    expect(mem.asignaciones.length).toBe(2);
  });

  it('errores: motivo corto 400, ya ANULADA 409, con historial 409 ASIGNACION_CON_HISTORIAL, inexistente 404', async () => {
    const creada = await servicio.crear(BASE, CTX);
    await expect(servicio.anular(creada.id, { motivo: 'abc' }, CTX)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    await expect(servicio.anular(99, { motivo: 'motivo válido' }, CTX)).rejects.toMatchObject({ code: 'ASIGNACION_NO_EXISTE', httpStatus: 404 });

    db.sequelize.query.mockResolvedValueOnce([{ total: 3 }]); // líneas PEV/supervisor referencian la asignación
    await expect(servicio.anular(creada.id, { motivo: 'motivo válido' }, CTX))
      .rejects.toMatchObject({ code: 'ASIGNACION_CON_HISTORIAL', httpStatus: 409 });

    await servicio.anular(creada.id, { motivo: 'motivo válido' }, CTX);
    await expect(servicio.anular(creada.id, { motivo: 'motivo válido' }, CTX))
      .rejects.toMatchObject({ code: 'ESTADO_INVALIDO', httpStatus: 409 });
  });
});
