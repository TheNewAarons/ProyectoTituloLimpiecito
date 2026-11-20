/**
 * RF-PEV-02c (C3) — services/pev/cumplimiento.js y el cierre 10->9 de services/pev/asignaciones.js con
 * modelos simulados en memoria (sin BD). Patrón: tests/services/pev/asignaciones.test.js.
 * Foco: marcas por asignación (propiedad por FK / n_empleado), precondiciones y códigos de error, idempotencia
 * con una sola auditoría, orden de locks, historial conservado tras cerrar/anular, dual-read con legacy y
 * que ninguna operación borra filas.
 */
const mockTx = { id: 'tx-prueba', LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } };

// Despacha las consultas SQL crudas (historial, conteos, tieneHistorial, delDia) sobre `mem`.
function mockDespacho(sql, o) {
  const rep = (o && o.replacements) || {};
  if (/AS total/.test(sql)) {
    return [{ total: mem.lineasPev.filter((l) => l.asignacionId === rep.id).length + mem.lineasSuper.filter((l) => l.asignacionId === rep.id).length }];
  }
  if (/aa\.trabajador_id/.test(sql)) return (mem.delDia || []).slice();
  if (/FROM linea_lista_pev_trabajadores l /.test(sql)) return filasPev(rep.id);
  if (/FROM linea_lista_super_trabajadores ls /.test(sql)) return filasSuper(rep.id);
  throw new Error('SQL no esperado en el mock: ' + sql);
}

jest.mock('../../../database/database', () => ({
  sequelize: {
    transaction: jest.fn(async (a, b) => (typeof a === 'function' ? a : b)(mockTx)),
    query: jest.fn((sql, o) => mockDespacho(sql, o))
  }
}));
jest.mock('../../../services/caja/cierre', () => ({ reintentarTransaccion: jest.fn((fn) => fn()) }));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));
jest.mock('../../../modelos/apartado_listas_pev/actividad', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/actividadAsignacion', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/area', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/sector', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/turno', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/tarea', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/turnoTarea', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/lineaSuperTrabajador', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/listaPevTrabajador', () => ({}));
jest.mock('../../../modelos/apartado_listas_pev/listaSuperTrabajador', () => ({}));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({}));

const mem = {
  actividades: [], asignaciones: [], areas: [], sectores: [], turnos: [], tareas: [], turnos_tareas: [],
  trabajadores: [], listasPev: [], listasSuper: [], lineasPev: [], lineasSuper: [], delDia: []
};

// Filas como las devuelve el SQL crudo: fecha de la lista en UTC (D-117) y hora UTC.
function fechaUtc(d) { return d.toISOString().slice(0, 19) + 'Z'; }
function filasPev(asignacionId) {
  return mem.lineasPev.filter((l) => l.asignacionId === asignacionId).map((l) => {
    const lp = mem.listasPev.find((x) => x.id === l.listasPevTrabajadoreId);
    return Object.assign({}, l, { lista_id: lp.id, lista_estado: lp.estado, fecha_utc: fechaUtc(lp.fecha_chequeo), hora_utc: lp.fecha_chequeo.getUTCHours() });
  });
}
function filasSuper(asignacionId) {
  return mem.lineasSuper.filter((l) => l.asignacionId === asignacionId).map((l) => {
    const st = mem.listasSuper.find((x) => x.id === l.listasSuperTrabajadoreId);
    const lp = mem.listasPev.find((x) => x.id === st.listasPevTrabajadoreId);
    return Object.assign({}, l, { lista_id: st.id, lista_estado: st.estado, fecha_utc: fechaUtc(lp.fecha_chequeo), hora_utc: lp.fecha_chequeo.getUTCHours() });
  });
}

function instancia(fila) {
  return Object.assign({}, fila, {
    get: () => Object.assign({}, fila),
    update: jest.fn(async function (cambios) { Object.assign(fila, cambios); Object.assign(this, cambios); return this; })
  });
}
const coincide = (fila, where) => Object.keys(where || {}).every((k) => fila[k] === where[k]);
function tabla(nombre) {
  return {
    findById: jest.fn(async (id) => { const f = mem[nombre].find((x) => x.id === Number(id)); return f ? instancia(f) : null; }),
    findOne: jest.fn(async (o) => { const f = mem[nombre].find((x) => coincide(x, o && o.where)); return f ? instancia(f) : null; }),
    findAll: jest.fn(async (o) => mem[nombre].filter((x) => coincide(x, o && o.where)).map(instancia)),
    create: jest.fn(async () => { throw new Error('create no esperado'); }),
    update: jest.fn(async () => [0]),
    destroy: jest.fn(async () => 0)
  };
}

const servicio = require('../../../services/pev/cumplimiento');
const asignaciones = require('../../../services/pev/asignaciones');
const { auditar } = require('../../../services/auditoria');
const db = require('../../../database/database');
const Actividad = require('../../../modelos/apartado_listas_pev/actividad');
const Asignacion = require('../../../modelos/apartado_listas_pev/actividadAsignacion');
const Area = require('../../../modelos/apartado_listas_pev/area');
const Sector = require('../../../modelos/apartado_listas_pev/sector');
const Turno = require('../../../modelos/apartado_listas_pev/turno');
const Tarea = require('../../../modelos/apartado_listas_pev/tarea');
const TurnoTarea = require('../../../modelos/apartado_listas_pev/turnoTarea');
const LineaPev = require('../../../modelos/apartado_listas_pev/lineaListaPevTrabajador');
const LineaSuper = require('../../../modelos/apartado_listas_pev/lineaSuperTrabajador');
const ListaPev = require('../../../modelos/apartado_listas_pev/listaPevTrabajador');
const ListaSuper = require('../../../modelos/apartado_listas_pev/listaSuperTrabajador');
const Trabajadore = require('../../../modelos/sistema_base/Trabajadore');

const TODOS = [Actividad, Asignacion, Area, Sector, Turno, Tarea, TurnoTarea, LineaPev, LineaSuper, ListaPev, ListaSuper, Trabajadore];
Object.assign(Actividad, tabla('actividades'));
Object.assign(Asignacion, tabla('asignaciones'));
Object.assign(Area, tabla('areas'));
Object.assign(Sector, tabla('sectores'));
Object.assign(Turno, tabla('turnos'));
Object.assign(Tarea, tabla('tareas'));
Object.assign(TurnoTarea, tabla('turnos_tareas'));
Object.assign(LineaPev, tabla('lineasPev'));
Object.assign(LineaSuper, tabla('lineasSuper'));
Object.assign(ListaPev, tabla('listasPev'));
Object.assign(ListaSuper, tabla('listasSuper'));
Object.assign(Trabajadore, tabla('trabajadores'));

const F10 = new Date('2026-03-10T04:00:00Z'); // día de cierre
const F12 = new Date('2026-03-12T04:00:00Z'); // posterior a fecha_hasta = 2026-03-10

// 10 asignaciones ACTIVA (una por trabajador). Por cada una: línea PEV y supervisor del día 10 (id i / 300+i)
// y su par posterior del día 12 (id 100+i / 400+i). Posterior de la asignación 1: PEV 101 + supervisor 401.
function fixturesDiez() {
  const fx = { actividades: [], asignaciones: [], trabajadores: [], listasPev: [], listasSuper: [], lineasPev: [], lineasSuper: [] };
  fx.actividades.push({ id: 1, cliente_id: 10, nombre: 'Pulido de pisos', estado: 1, origen: 'APP', created_by: 7 });
  for (let i = 1; i <= 10; i++) {
    fx.trabajadores.push({ id: i, n_empleado: 100 + i, nombre: 'T' + i, apellido: 'Prueba', estado: 1 });
    fx.asignaciones.push({ id: i, actividad_id: 1, area_id: 2, trabajador_id: i, turno_id: 3, tarea_id: 30, fecha_desde: '2026-03-01', fecha_hasta: null, estado: 'ACTIVA', activa_flag: 1 });
    fx.listasPev.push({ id: i, estado: 1, fecha_chequeo: F10 }, { id: 100 + i, estado: 1, fecha_chequeo: F12 });
    fx.lineasPev.push(
      { id: i, asignacionId: i, listasPevTrabajadoreId: i, tareaId: 30, check_trabajador_1: 0, hora_check_trabajador_1: null, check_trabajador_2: 0, hora_check_trabajador_2: null, check_trabajador_3: 0, hora_check_trabajador_3: null, observaciones: null },
      { id: 100 + i, asignacionId: i, listasPevTrabajadoreId: 100 + i, tareaId: 30, check_trabajador_1: 0, hora_check_trabajador_1: null, check_trabajador_2: 0, hora_check_trabajador_2: null, check_trabajador_3: 0, hora_check_trabajador_3: null, observaciones: null }
    );
    fx.listasSuper.push(
      { id: i, estado: 1, listasPevTrabajadoreId: i, n_empleado: 100 + i },
      { id: 100 + i, estado: 1, listasPevTrabajadoreId: 100 + i, n_empleado: 100 + i }
    );
    fx.lineasSuper.push(
      { id: 300 + i, asignacionId: i, listasSuperTrabajadoreId: i, tareaId: 30, hora_1: null, despolvado_1: 0, aplicacion_producto_1: 0, abrillantado_1: 0, hora_2: null, despolvado_2: 0, aplicacion_producto_2: 0, abrillantado_2: 0, hora_3: null, despolvado_3: 0, aplicacion_producto_3: 0, abrillantado_3: 0, observaciones: null },
      { id: 400 + i, asignacionId: i, listasSuperTrabajadoreId: 100 + i, tareaId: 30, hora_1: null, despolvado_1: 0, aplicacion_producto_1: 0, abrillantado_1: 0, hora_2: null, despolvado_2: 0, aplicacion_producto_2: 0, abrillantado_2: 0, hora_3: null, despolvado_3: 0, aplicacion_producto_3: 0, abrillantado_3: 0, observaciones: null }
    );
  }
  return fx;
}

function cargar(fx) {
  Object.keys(mem).forEach((k) => { mem[k] = []; });
  Object.keys(fx).forEach((k) => { mem[k] = fx[k]; });
}

const ctxTrabajador = (id) => ({ usuario: { id: id, n_empleado: 100 + id, contexto: 'acceso_trabajadores' }, ip: '10.0.0.1' });
const ctxSupervisor = (nEmpleado) => ({ usuario: { id: nEmpleado - 100, n_empleado: nEmpleado, contexto: 'acceso_trabajadores' }, ip: '10.0.0.1' });
const ADMIN = { usuario: { id: 7, contexto: 'usuarios' }, ip: '127.0.0.1' };

const ESCRITURA = [LineaPev, LineaSuper, ListaPev, ListaSuper, Asignacion, Actividad, Area, Sector, Turno, Tarea, TurnoTarea];

beforeEach(() => {
  jest.clearAllMocks();
  cargar(fixturesDiez());
});

describe('marcarPaso (trabajador)', () => {
  it('camino feliz: marca el paso, hora del servidor (HH:mm:ss) y una auditoría EDITAR en la misma tx', async () => {
    const r = await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    expect(r.sin_cambios).toBe(false);
    expect(r.linea.pasos[0]).toMatchObject({ paso: 1, marcado: 1 });
    expect(r.linea.pasos[0].hora).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(mem.lineasPev[0]).toMatchObject({ check_trabajador_1: 1, hora_check_trabajador_1: r.linea.pasos[0].hora });
    expect(auditar).toHaveBeenCalledTimes(1);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: mockTx, entidad: 'linea_lista_pev_trabajadores', entidad_id: 1, accion: 'EDITAR',
      antes: expect.objectContaining({ check_trabajador_1: 0 })
    }));
  });

  it('idempotencia: segundo PATCH sobre el mismo paso no pisa la hora ni audita de nuevo', async () => {
    await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    const horaPrimera = mem.lineasPev[0].hora_check_trabajador_1;
    const r = await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    expect(r.sin_cambios).toBe(true);
    expect(mem.lineasPev[0].hora_check_trabajador_1).toBe(horaPrimera);
    expect(auditar).toHaveBeenCalledTimes(1);
  });

  it('dual-read: un paso escrito por legacy (check + hora) cuenta como marcado (sin_cambios, sin auditoría)', async () => {
    const linea5 = mem.lineasPev.find((l) => l.id === 5);
    linea5.check_trabajador_2 = 1;
    linea5.hora_check_trabajador_2 = '09:15:00';
    const r = await servicio.marcarPaso(5, 2, ctxTrabajador(5));
    expect(r.sin_cambios).toBe(true);
    expect(r.linea.pasos[1]).toEqual({ paso: 2, marcado: 1, hora: '09:15:00' });
    expect(auditar).not.toHaveBeenCalled();
  });

  it('IDOR: línea de la asignación de otro trabajador -> 403 ASIGNACION_AJENA sin escribir', async () => {
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(9))).rejects.toMatchObject({ httpStatus: 403, code: 'ASIGNACION_AJENA' });
    expect(mem.lineasPev[0].check_trabajador_1).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('lista firmada -> 409 LISTA_FIRMADA', async () => {
    mem.listasPev[0].estado = 0;
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 409, code: 'LISTA_FIRMADA' });
  });

  it('asignacionId NULL (huérfana) -> 409 LINEA_SIN_ASIGNACION; línea inexistente -> 404 LINEA_NO_EXISTE', async () => {
    mem.lineasPev[0].asignacionId = null;
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 409, code: 'LINEA_SIN_ASIGNACION' });
    await expect(servicio.marcarPaso(999, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 404, code: 'LINEA_NO_EXISTE' });
  });

  it('asignación ANULADA -> 409 ASIGNACION_NO_VIGENTE', async () => {
    mem.asignaciones[0].estado = 'ANULADA';
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 409, code: 'ASIGNACION_NO_VIGENTE' });
  });

  it('propiedad antes que estado: lista firmada de OTRO trabajador -> 403 sin revelar ids ajenos', async () => {
    mem.listasPev[0].estado = 0;
    const err = await servicio.marcarPaso(1, 1, ctxTrabajador(9)).catch((e) => e);
    expect(err).toMatchObject({ httpStatus: 403, code: 'ASIGNACION_AJENA' });
    expect(err.details).toEqual({ linea_id: 1 });
  });

  it('línea de fecha futura -> 409 LINEA_FUTURA sin escribir', async () => {
    mem.listasPev[0].fecha_chequeo = new Date(Date.now() + 3 * 864e5);
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 409, code: 'LINEA_FUTURA' });
    expect(mem.lineasPev[0].check_trabajador_1).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('línea borrada entre la lectura y el FOR UPDATE (cascada legacy) -> 404, no TypeError', async () => {
    const original = LineaPev.findById.getMockImplementation();
    LineaPev.findById.mockImplementation(async (id, o) => (o && o.lock === 'UPDATE' ? null : original(id, o)));
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 404, code: 'LINEA_NO_EXISTE' });
    LineaPev.findById.mockImplementation(original);
  });

  it('la lista se lee con LOCK IN SHARE MODE (la firma legacy no se cuela antes del UPDATE)', async () => {
    await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    expect(ListaPev.findById).toHaveBeenCalledWith(1, expect.objectContaining({ lock: 'SHARE' }));
  });

  it('bloqueo: consulta la asignación con LOCK IN SHARE MODE antes que la línea FOR UPDATE', async () => {
    await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    const iAsig = Asignacion.findById.mock.calls.findIndex((c) => c[1] && c[1].lock === 'SHARE');
    const iLinea = LineaPev.findById.mock.calls.findIndex((c) => c[1] && c[1].lock === 'UPDATE');
    expect(iAsig).toBeGreaterThanOrEqual(0);
    expect(iLinea).toBeGreaterThanOrEqual(0);
    expect(Asignacion.findById.mock.invocationCallOrder[iAsig]).toBeLessThan(LineaPev.findById.mock.invocationCallOrder[iLinea]);
  });
});

describe('chequear y observar (supervisor, propiedad por n_empleado de la lista)', () => {
  const VALORES = { despolvado: 1, aplicacion_producto: 0, abrillantado: 1 };

  it('chequear: deriva las columnas de la ronda, hora del servidor, auditoría; repetir -> sin_cambios', async () => {
    const r = await servicio.chequear(301, 1, VALORES, ctxSupervisor(101));
    expect(r.sin_cambios).toBe(false);
    expect(mem.lineasSuper[0]).toMatchObject({ despolvado_1: 1, aplicacion_producto_1: 0, abrillantado_1: 1 });
    expect(mem.lineasSuper[0].hora_1).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'linea_lista_super_trabajadores', entidad_id: 301, accion: 'EDITAR' }));
    const segunda = await servicio.chequear(301, 1, VALORES, ctxSupervisor(101));
    expect(segunda.sin_cambios).toBe(true);
    expect(auditar).toHaveBeenCalledTimes(1);
  });

  it('LISTA_AJENA: n_empleado de otro supervisor, nulo o ambiguo (2 trabajadores con el mismo n_empleado) -> 403', async () => {
    await expect(servicio.chequear(301, 1, VALORES, ctxSupervisor(102))).rejects.toMatchObject({ httpStatus: 403, code: 'LISTA_AJENA' });
    await expect(servicio.chequear(301, 1, VALORES, { usuario: { id: 1, n_empleado: null } })).rejects.toMatchObject({ httpStatus: 403, code: 'LISTA_AJENA' });
    mem.trabajadores.push({ id: 11, n_empleado: 101, nombre: 'Homonimo', apellido: 'X', estado: 1 });
    await expect(servicio.chequear(301, 1, VALORES, ctxSupervisor(101))).rejects.toMatchObject({ httpStatus: 403, code: 'LISTA_AJENA' });
    expect(mem.lineasSuper[0].despolvado_1).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('observar: sobrescribe la observación y el valor anterior queda en auditoria.antes; "" -> NULL', async () => {
    await servicio.observar(301, 'primera', ctxSupervisor(101));
    const r = await servicio.observar(301, 'segunda', ctxSupervisor(101));
    expect(r.linea.observaciones).toBe('segunda');
    expect(mem.lineasSuper[0].observaciones).toBe('segunda');
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({
      entidad: 'linea_lista_super_trabajadores', entidad_id: 301, accion: 'EDITAR',
      antes: expect.objectContaining({ observaciones: 'primera' })
    }));
    await servicio.observar(301, '', ctxSupervisor(101));
    expect(mem.lineasSuper[0].observaciones).toBeNull();
    const repetida = await servicio.observar(301, '', ctxSupervisor(101));
    expect(repetida.sin_cambios).toBe(true);
  });

  it('propiedad antes que estado: lista firmada de OTRO supervisor -> 403 LISTA_AJENA, no 409', async () => {
    mem.listasSuper[0].estado = 0;
    await expect(servicio.chequear(301, 1, VALORES, ctxSupervisor(109))).rejects.toMatchObject({ httpStatus: 403, code: 'LISTA_AJENA' });
  });

  it('observar: otro supervisor -> 403 LISTA_AJENA y la observación no cambia', async () => {
    await expect(servicio.observar(301, 'intruso', ctxSupervisor(102))).rejects.toMatchObject({ httpStatus: 403, code: 'LISTA_AJENA' });
    expect(mem.lineasSuper[0].observaciones).toBeNull();
  });
});

describe('escenario 10 -> 9 (cerrar 1 de 10 asignaciones ACTIVA)', () => {
  it('solo la asignación 1 pasa a CERRADA; sin DELETE ni destroy en ninguna tabla; meta.lineas_posteriores = 2', async () => {
    const lineasAntes = mem.lineasPev.length + mem.lineasSuper.length;
    const r = await asignaciones.cerrar(1, { fecha_hasta: '2026-03-10' }, ADMIN);
    expect(r).toMatchObject({ id: 1, estado: 'CERRADA', activa_flag: null, fecha_hasta: '2026-03-10', lineas_posteriores: 2 });
    expect(mem.asignaciones.filter((a) => a.estado === 'ACTIVA').map((a) => a.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(mem.asignaciones.filter((a) => a.estado === 'CERRADA').map((a) => a.id)).toEqual([1]);
    expect(mem.asignaciones).toHaveLength(10);
    expect(mem.lineasPev.length + mem.lineasSuper.length).toBe(lineasAntes);
    ESCRITURA.forEach((m) => expect(m.destroy).not.toHaveBeenCalled());
    expect(db.sequelize.query.mock.calls.some((c) => /DELETE/i.test(c[0]))).toBe(false);
  });

  it('línea posterior a fecha_hasta -> 409 ASIGNACION_NO_VIGENTE; la del día de cierre sigue marcable; las otras 9 siguen marcando', async () => {
    await asignaciones.cerrar(1, { fecha_hasta: '2026-03-10' }, ADMIN);
    await expect(servicio.marcarPaso(101, 1, ctxTrabajador(1))).rejects.toMatchObject({ httpStatus: 409, code: 'ASIGNACION_NO_VIGENTE' });
    await expect(servicio.marcarPaso(1, 1, ctxTrabajador(1))).resolves.toMatchObject({ sin_cambios: false });
    for (let i = 2; i <= 10; i++) {
      const r = await servicio.marcarPaso(100 + i, 1, ctxTrabajador(i));
      expect(r.sin_cambios).toBe(false);
    }
  });

  it('cerrar con fecha_hasta anterior a fecha_desde -> 400 CAMPO_INVALIDO y no cambia nada', async () => {
    await expect(asignaciones.cerrar(1, { fecha_hasta: '2026-02-01' }, ADMIN)).rejects.toMatchObject({ httpStatus: 400, code: 'CAMPO_INVALIDO' });
    expect(mem.asignaciones[0].estado).toBe('ACTIVA');
  });
});

describe('historial conservado tras cerrar y anular', () => {
  it('cumplimiento devuelve las líneas previas con marcas y observaciones; la observación sobrescrita deja el valor anterior en auditoria', async () => {
    await servicio.marcarPaso(1, 1, ctxTrabajador(1));
    await servicio.marcarPaso(1, 2, ctxTrabajador(1));
    await servicio.observar(301, 'primera', ctxSupervisor(101));
    await asignaciones.cerrar(1, { fecha_hasta: '2026-03-10' }, ADMIN);
    await servicio.observar(301, 'segunda', ctxSupervisor(101));

    const h = await servicio.historial(1, {});
    expect(h.count).toBe(4); // PEV 1 y 101, supervisor 301 y 401
    const previa = h.rows.find((f) => f.id === 1);
    expect(previa).toMatchObject({ tipo: 'trabajador', fecha: '2026-03-10', asignacionId: 1 });
    expect(previa.pasos.map((p) => p.marcado)).toEqual([1, 1, 0]);
    expect(h.rows.find((f) => f.id === 301)).toMatchObject({ tipo: 'supervisor', observaciones: 'segunda' });
    expect(auditar).toHaveBeenLastCalledWith(expect.objectContaining({ antes: expect.objectContaining({ observaciones: 'primera' }) }));
  });

  it('anular una asignación con historial -> 409 ASIGNACION_CON_HISTORIAL; sin historial sí se anula', async () => {
    await asignaciones.cerrar(1, { fecha_hasta: '2026-03-10' }, ADMIN);
    await expect(asignaciones.anular(1, { motivo: 'carga duplicada' }, ADMIN)).rejects.toMatchObject({ httpStatus: 409, code: 'ASIGNACION_CON_HISTORIAL' });
    mem.asignaciones.push({ id: 11, actividad_id: 1, area_id: 2, trabajador_id: 11, turno_id: 3, tarea_id: 30, fecha_desde: '2026-03-01', fecha_hasta: null, estado: 'ACTIVA', activa_flag: 1 });
    const anulada = await asignaciones.anular(11, { motivo: 'carga duplicada' }, ADMIN);
    expect(anulada).toMatchObject({ id: 11, estado: 'ANULADA', motivo: 'carga duplicada' });
  });

  it('filtros: desde ajusta el rango; asignación inexistente -> 404 ASIGNACION_NO_EXISTE', async () => {
    const solo12 = await servicio.historial(1, { desde: '2026-03-11' });
    expect(solo12.rows.map((f) => f.fecha)).toEqual(['2026-03-12', '2026-03-12']);
    await expect(servicio.historial(999, {})).rejects.toMatchObject({ httpStatus: 404, code: 'ASIGNACION_NO_EXISTE' });
  });
});

describe('delDia (lectura de la app laboral)', () => {
  it('acota la consulta a ±1 día y filtra en JS la fecha exacta de negocio', async () => {
    mem.delDia = [
      { id: 1, asignacionId: 1, fecha_utc: '2026-03-10T04:00:00Z', hora_utc: 4, check_trabajador_1: 0 },
      { id: 2, asignacionId: 1, fecha_utc: '2026-03-11T04:00:00Z', hora_utc: 4, check_trabajador_1: 0 }
    ];
    const lineas = await servicio.delDia(1, '2026-03-10');
    const rep = db.sequelize.query.mock.calls.find((c) => /aa\.trabajador_id/.test(c[0]))[1].replacements;
    expect(rep).toEqual({ trabajadorId: 1, fecha: '2026-03-10', desde: '2026-03-09', hasta: '2026-03-12' });
    expect(lineas.map((l) => l.id)).toEqual([1]);
  });
});
