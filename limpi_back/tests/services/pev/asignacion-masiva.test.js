/**
 * RF-PEV-01 — services/pev/asignacion-masiva: validación, vista previa (mismas reglas que asignaciones.crear) y
 * ejecución en una sola transacción con las funciones de Aarón inyectadas.
 */
const mock = { actividades: [], areas: [], sectores: [], turnos: [], trabajadores: [], asignaciones: [] };
const porId = (lista) => jest.fn(async (id) => mock[lista].find((x) => x.id === id) || null);
const enIds = (lista) => jest.fn(async ({ where }) => mock[lista].filter((x) => where.id.includes(x.id)));
jest.mock('../../../database/database', () => ({ sequelize: { transaction: jest.fn(async (o, cb) => cb({ LOCK: { UPDATE: 'UPDATE' } })) } }));
jest.mock('../../../modelos/apartado_listas_pev/actividad', () => ({
  findById: porId('actividades'),
  findOne: jest.fn(async ({ where }) => mock.actividades.find((x) => x.cliente_id === where.cliente_id && x.nombre === where.nombre) || null)
}));
jest.mock('../../../services/caja/cierre', () => ({ reintentarTransaccion: jest.fn((fn) => fn()) }));
// AUT-026: la regla de cronograma se prueba en asignacion-cronograma-regla.test.js; aquí siempre pasa.
jest.mock('../../../services/pev/asignacion-cronograma-regla', () => ({ validarDesde: jest.fn(async () => ({})) }));
jest.mock('../../../modelos/apartado_listas_pev/turno', () => ({ findById: porId('turnos') }));
jest.mock('../../../modelos/apartado_listas_pev/area', () => ({ findAll: enIds('areas') }));
jest.mock('../../../modelos/apartado_listas_pev/sector', () => ({ findAll: enIds('sectores') }));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({ findAll: enIds('trabajadores') }));
jest.mock('../../../modelos/apartado_listas_pev/actividadAsignacion', () => ({
  findAll: jest.fn(async ({ where }) => mock.asignaciones.filter((x) => x.actividad_id === where.actividad_id && x.turno_id === where.turno_id))
}));

const s = require('../../../services/pev/asignacion-masiva');

const detalles = async (fn) => { try { await fn(); } catch (e) { return { code: e.code, status: e.httpStatus, details: e.details }; } return null; };
const base = (filas, extra) => Object.assign({ cliente_id: 1, turno_id: 10, actividad_id: 100, fecha_desde: '2026-11-20', filas: filas }, extra);

beforeEach(() => {
  Object.assign(mock, {
    actividades: [{ id: 100, cliente_id: 1, nombre: 'Barrido', estado: 1 }, { id: 101, cliente_id: 2, nombre: 'Otra', estado: 1 }, { id: 102, cliente_id: 1, nombre: 'Vieja', estado: 0 }],
    turnos: [{ id: 10, nombre: 'Mañana', clienteId: 1 }, { id: 20, nombre: 'Otro', clienteId: 2 }],
    sectores: [{ id: 1, clienteId: 1 }, { id: 2, clienteId: 2 }],
    areas: [{ id: 11, sectoreId: 1 }, { id: 12, sectoreId: 1 }, { id: 21, sectoreId: 2 }],
    trabajadores: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    asignaciones: [
      { actividad_id: 100, turno_id: 10, trabajador_id: 1, area_id: 11, estado: 'ACTIVA', fecha_hasta: null },
      { actividad_id: 100, turno_id: 10, trabajador_id: 2, area_id: 12, estado: 'CERRADA', fecha_hasta: '2026-11-30' }
    ]
  });
});

describe('normalizar', () => {
  it('exige cliente, turno, una sola forma de actividad y al menos una fila; une filas repetidas', () => {
    const e = s.normalizar(base([{ trabajador_id: '3', area_id: 11 }, { trabajador_id: 3, area_id: '11' }]));
    expect(e).toMatchObject({ cliente_id: 1, turno_id: 10, actividad_id: 100, actividad_nombre: null, repetidas: 1 });
    expect(e.filas).toEqual([{ trabajador_id: 3, area_id: 11 }]);
  });

  it('errores por campo', async () => {
    const r = await detalles(() => s.normalizar({ cliente_id: 'x', actividad_id: 1, actividad_nombre: 'Barrido', filas: [] }));
    expect(r.status).toBe(400);
    expect(Object.keys(r.details).sort()).toEqual(['actividad', 'cliente_id', 'filas', 'turno_id']);
  });

  it('tope de 500 filas por operación', async () => {
    const filas = Array.from({ length: 501 }, (_, i) => ({ trabajador_id: i + 1, area_id: 11 }));
    expect((await detalles(() => s.normalizar(base(filas)))).details.filas).toMatch(/500/);
  });

  it('un área por trabajador (D-PEV-01-2) y nombre nuevo de máximo 100 caracteres (como actividades.crear)', async () => {
    expect((await detalles(() => s.normalizar(base([{ trabajador_id: 3, area_id: 11 }, { trabajador_id: 3, area_id: 12 }])))).details['filas.1']).toMatch(/dos áreas/);
    const largo = await detalles(() => s.normalizar(base([{ trabajador_id: 3, area_id: 11 }], { actividad_id: null, actividad_nombre: 'x'.repeat(101) })));
    expect(largo.details.actividad).toMatch(/100/);
    expect(s.normalizar(base([{ trabajador_id: 3, area_id: 11 }], { actividad_id: null, actividad_nombre: 'x'.repeat(100) })).actividad_nombre).toHaveLength(100);
  });
});

describe('previsualizar', () => {
  it('clasifica cada fila con las reglas de asignaciones.crear', async () => {
    const p = await s.previsualizar(base([
      { trabajador_id: 3, area_id: 11 }, // nueva
      { trabajador_id: 1, area_id: 11 }, // ya ACTIVA
      { trabajador_id: 2, area_id: 12 }, // CERRADA que cubre la fecha
      { trabajador_id: 4, area_id: 21 }, // área de otro cliente
      { trabajador_id: 9, area_id: 12 }, // trabajador inexistente
      { trabajador_id: 5, area_id: 99 } // área inexistente
    ]));
    expect(p.filas.map((f) => f.resultado)).toEqual(['CREAR', 'YA_ASIGNADA', 'VIGENCIA_SOLAPADA', 'AREA_CLIENTE_DISTINTO', 'TRABAJADOR_NO_EXISTE', 'AREA_NO_EXISTE']);
    expect(p.resumen).toEqual({ a_crear: 1, ya_asignadas: 1, con_error: 4, repetidas_en_la_seleccion: 0 });
  });

  it('una CERRADA que termina antes de fecha_desde no bloquea', async () => {
    const p = await s.previsualizar(base([{ trabajador_id: 2, area_id: 12 }], { fecha_desde: '2026-12-01' }));
    expect(p.filas[0].resultado).toBe('CREAR');
  });

  it('actividad nueva: todas las filas válidas se crean', async () => {
    const p = await s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { actividad_id: null, actividad_nombre: 'Uso de EPP' }));
    expect(p.actividad).toEqual({ id: null, nombre: 'Uso de EPP', nueva: true });
    expect(p.filas[0].resultado).toBe('CREAR');
  });

  it('actividad nueva con nombre ya usado en el cliente: ACTIVIDAD_DUPLICADA ya en la vista previa', async () => {
    const r = await detalles(() => s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { actividad_id: null, actividad_nombre: 'Barrido' })));
    expect(r).toMatchObject({ code: 'ACTIVIDAD_DUPLICADA', status: 409 });
    // El mismo nombre en otro cliente sí se permite.
    expect((await s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { actividad_id: null, actividad_nombre: 'Otra' }))).actividad.nueva).toBe(true);
  });

  it('rechaza actividad inactiva, de otro cliente, o turno de otro cliente', async () => {
    expect((await detalles(() => s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { actividad_id: 102 })))).code).toBe('ACTIVIDAD_INACTIVA');
    expect((await detalles(() => s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { actividad_id: 101 })))).code).toBe('ACTIVIDAD_CLIENTE_DISTINTO');
    expect((await detalles(() => s.previsualizar(base([{ trabajador_id: 1, area_id: 11 }], { turno_id: 20 })))).code).toBe('TURNO_CLIENTE_DISTINTO');
  });
});

describe('ejecutar', () => {
  const ctx = { usuario: { id: 7, contexto: 'usuarios' }, ip: '1.1.1.1' };
  const fakes = () => ({
    crearActividadEnTx: jest.fn(async (t, cliente, nombre) => ({ id: 500, cliente_id: cliente, nombre: nombre })),
    crearAsignacionEnTx: jest.fn(async (t, e) => ({ id: 1000 + e.trabajador_id }))
  });

  it('sin las funciones conectadas responde 503 sin tocar nada', async () => {
    expect((await detalles(() => s.ejecutar(base([{ trabajador_id: 3, area_id: 11 }]), ctx, {})))).toMatchObject({ code: 'NO_DISPONIBLE', status: 503 });
  });

  it('crea solo las filas nuevas, omite las ya asignadas y usa una transacción', async () => {
    const d = fakes();
    const r = await s.ejecutar(base([{ trabajador_id: 3, area_id: 11 }, { trabajador_id: 1, area_id: 11 }, { trabajador_id: 4, area_id: 12 }]), ctx, d);
    expect(d.crearAsignacionEnTx).toHaveBeenCalledTimes(2);
    expect(d.crearAsignacionEnTx.mock.calls[0][1]).toEqual({ actividad_id: 100, area_id: 11, trabajador_id: 3, turno_id: 10, fecha_desde: '2026-11-20' });
    expect(d.crearAsignacionEnTx.mock.calls[0][2]).toBe(ctx);
    expect(r.asignaciones_creadas).toEqual([1003, 1004]);
    expect(require('../../../services/caja/cierre').reintentarTransaccion).toHaveBeenCalled();
    expect(r.resumen).toMatchObject({ a_crear: 2, ya_asignadas: 1 });
    expect(require('../../../database/database').sequelize.transaction).toHaveBeenCalled();
  });

  it('con actividad nueva la crea primero (misma transacción) y asigna a todos con ese id', async () => {
    const d = fakes();
    const r = await s.ejecutar(base([{ trabajador_id: 1, area_id: 11 }, { trabajador_id: 2, area_id: 11 }], { actividad_id: null, actividad_nombre: 'Barrido tribuna' }), ctx, d);
    expect(d.crearActividadEnTx).toHaveBeenCalledWith(expect.anything(), 1, 'Barrido tribuna', ctx);
    expect(d.crearAsignacionEnTx.mock.calls.map((c) => c[1].actividad_id)).toEqual([500, 500]);
    expect(r.actividad).toEqual({ id: 500, nombre: 'Barrido tribuna', nueva: true });
  });

  it('si alguna fila tiene error no crea nada (todo o nada) y devuelve el detalle', async () => {
    const d = fakes();
    const r = await detalles(() => s.ejecutar(base([{ trabajador_id: 3, area_id: 11 }, { trabajador_id: 4, area_id: 21 }]), ctx, d));
    expect(r).toMatchObject({ code: 'ASIGNACION_MASIVA_INVALIDA', status: 409 });
    expect(r.details.filas).toEqual([{ trabajador_id: 4, area_id: 21, resultado: 'AREA_CLIENTE_DISTINTO' }]);
    expect(d.crearAsignacionEnTx).not.toHaveBeenCalled();
    expect(d.crearActividadEnTx).not.toHaveBeenCalled();
  });
});

// RF-PEV-02 (AUT-016, obs. 12): la vista previa informa a qué cronogramas llega; al confirmar no se consulta.
describe('vista previa → cronograma', () => {
  const cronograma = require('../../../services/pev/cronograma-asignacion');

  it('previsualizar agrega `cronograma` con los destinos (cliente, turno y fecha de la selección)', async () => {
    const espia = jest.spyOn(cronograma, 'destinoVistaPrevia').mockResolvedValue({ cronogramas: [{ id: 89, inicio: '2026-11-01', fin: '2026-11-30' }], sin_cronograma: false });
    const plan = await s.previsualizar(base([{ trabajador_id: 3, area_id: 11 }]));
    expect(espia).toHaveBeenCalledWith(1, 10, '2026-11-20');
    expect(plan.cronograma).toEqual({ cronogramas: [{ id: 89, inicio: '2026-11-01', fin: '2026-11-30' }], sin_cronograma: false });
    espia.mockRestore();
  });

  it('al confirmar (con transacción) no consulta los destinos', async () => {
    const espia = jest.spyOn(cronograma, 'destinoVistaPrevia');
    await s.ejecutar(base([{ trabajador_id: 3, area_id: 11 }]), { usuario: { id: 7, contexto: 'usuarios' } },
      { crearActividadEnTx: jest.fn(), crearAsignacionEnTx: jest.fn(async (t, e) => ({ id: 1000 + e.trabajador_id })) });
    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });
});

// AUT-026 (retroalimentación): "Desde" fuera de un cronograma vigente detiene la vista previa y la ejecución.
describe('Desde anclado a un cronograma vigente', () => {
  const regla = require('../../../services/pev/asignacion-cronograma-regla');
  const AppError = require('../../../libs/app-error');
  const fuera = () => regla.validarDesde.mockRejectedValueOnce(new AppError('FECHA_FUERA_DE_CRONOGRAMA', 'fuera', 400));

  it('la vista previa valida cliente, turno y fecha, y propaga el 400', async () => {
    fuera();
    await expect(s.previsualizar(base([{ trabajador_id: 1, area_id: 1 }], { fecha_desde: '2050-03-10' })))
      .rejects.toMatchObject({ code: 'FECHA_FUERA_DE_CRONOGRAMA', httpStatus: 400 });
    expect(regla.validarDesde).toHaveBeenLastCalledWith(1, 10, '2050-03-10');
  });

  it('ejecutar no abre la transacción ni crea asignaciones', async () => {
    const tx = require('../../../database/database').sequelize.transaction;
    tx.mockClear();
    fuera();
    const crear = jest.fn();
    await expect(s.ejecutar(base([{ trabajador_id: 1, area_id: 1 }]), { usuario: { id: 1 } }, { crearActividadEnTx: jest.fn(), crearAsignacionEnTx: crear }))
      .rejects.toMatchObject({ code: 'FECHA_FUERA_DE_CRONOGRAMA' });
    expect(tx).not.toHaveBeenCalled();
    expect(crear).not.toHaveBeenCalled();
  });
});
