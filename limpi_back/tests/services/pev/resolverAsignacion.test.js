/**
 * RF-PEV-02b (B2) — services/pev/resolverAsignacion.js sin BD: `sequelize.query` simulado por tipo de SQL.
 * Foco: misma regla que M2 (vigente, sin asignación, n_empleado ambiguo, APP gana, fecha D-117) y que nunca lanza.
 */
jest.mock('../../../database/database', () => ({ sequelize: { query: jest.fn() } }));

const db = require('../../../database/database');
const { resolverAsignacion, asignacionDeLineaPev, fechaDeNegocio } = require('../../../services/pev/resolverAsignacion');

let bd;
function simular() {
  db.sequelize.query.mockImplementation(async (sql, o) => {
    if (bd.error) throw bd.error;
    if (sql.indexOf('FROM listas_pev_trabajadores') !== -1) return bd.listas.filter((l) => l.id === o.replacements.id);
    if (sql.indexOf('FROM trabajadores') !== -1) return bd.trabajadores.filter((t) => t.n_empleado === o.replacements.n).slice(0, 2);
    if (sql.indexOf('FROM tareas t') !== -1) { bd.fechas.push(o.replacements.fecha); return bd.candidatas; }
    if (sql.indexOf('SELECT DISTINCT l.asignacionId') !== -1) return bd.lineas;
    throw new Error('SQL no esperado: ' + sql);
  });
}

const base = { tareaId: 7, n_empleado: 120, cronogramaId: 3, fecha_chequeo: '2026-03-10T15:00:00Z' };

beforeEach(() => {
  bd = { listas: [], trabajadores: [{ id: 11, n_empleado: 120 }], candidatas: [], lineas: [], fechas: [], error: null };
  db.sequelize.query.mockReset();
  simular();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => console.warn.mockRestore());

describe('resolverAsignacion', () => {
  test('asignación vigente única → su id, filtrando por trabajador, tarea, cronograma y fecha', async () => {
    bd.candidatas = [{ id: 40, origen: 'BACKFILL' }];
    expect(await resolverAsignacion(base)).toBe(40);
    const llamada = db.sequelize.query.mock.calls.find((c) => c[0].indexOf('FROM tareas t') !== -1);
    expect(llamada[0]).toMatch(/aa\.turno_id <=> c\.turnoId/);
    expect(llamada[0]).toMatch(/aa\.estado <> 'ANULADA'/);
    expect(llamada[1].replacements).toEqual({ cronogramaId: 3, trabajadorId: 11, tareaId: 7, fecha: '2026-03-10' });
  });

  test('sin asignación vigente → null', async () => {
    expect(await resolverAsignacion(base)).toBeNull();
  });

  test('n_empleado ambiguo (2 trabajadores) → null sin consultar asignaciones y sin loguear el n_empleado', async () => {
    bd.trabajadores.push({ id: 12, n_empleado: 120 });
    bd.candidatas = [{ id: 40, origen: 'APP' }];
    expect(await resolverAsignacion(base)).toBeNull();
    expect(bd.fechas).toEqual([]);
    expect(console.warn.mock.calls[0][0]).toMatch(/N_EMPLEADO_AMBIGUO/);
    expect(console.warn.mock.calls[0][0]).not.toMatch(/120/);
  });

  test('n_empleado inexistente → null', async () => {
    bd.trabajadores = [];
    expect(await resolverAsignacion(base)).toBeNull();
  });

  test('APP gana sobre BACKFILL; dos APP → null (ambiguo)', async () => {
    bd.candidatas = [{ id: 40, origen: 'BACKFILL' }, { id: 41, origen: 'APP' }];
    expect(await resolverAsignacion(base)).toBe(41);
    bd.candidatas = [{ id: 41, origen: 'APP' }, { id: 42, origen: 'APP' }];
    expect(await resolverAsignacion(base)).toBeNull();
    bd.candidatas = [{ id: 40, origen: 'BACKFILL' }, { id: 43, origen: 'BACKFILL' }];
    expect(await resolverAsignacion(base)).toBeNull();
  });

  test('fecha D-117: hora UTC 3/4 se lleva a Santiago; otra hora usa la fecha UTC', async () => {
    bd.candidatas = [{ id: 40, origen: 'APP' }];
    await resolverAsignacion(Object.assign({}, base, { fecha_chequeo: '2026-06-10T03:30:00Z' })); // invierno UTC-4
    await resolverAsignacion(Object.assign({}, base, { fecha_chequeo: new Date('2026-06-10T04:00:00Z') })); // Date de Sequelize
    await resolverAsignacion(Object.assign({}, base, { fecha_chequeo: '2026-01-10T03:30:00Z' })); // verano UTC-3
    await resolverAsignacion(Object.assign({}, base, { fecha_chequeo: '2026-06-10T23:00:00Z' }));
    expect(bd.fechas).toEqual(['2026-06-09', '2026-06-10', '2026-01-10', '2026-06-10']);
    expect(fechaDeNegocio('no-es-fecha')).toBeNull();
  });

  test('con listaPevId lee n_empleado/cronograma/fecha de la lista', async () => {
    bd.listas = [{ id: 9, n_empleado: 120, cronogramaId: 3, fecha_chequeo: new Date('2026-03-10T15:00:00Z') }];
    bd.candidatas = [{ id: 40, origen: 'APP' }];
    expect(await resolverAsignacion({ tareaId: 7, listaPevId: 9 })).toBe(40);
    expect(await resolverAsignacion({ tareaId: 7, listaPevId: 99 })).toBeNull();
  });

  test('datos incompletos → null sin consultar', async () => {
    expect(await resolverAsignacion(Object.assign({}, base, { cronogramaId: null }))).toBeNull();
    expect(await resolverAsignacion(Object.assign({}, base, { n_empleado: undefined }))).toBeNull();
    expect(await resolverAsignacion(Object.assign({}, base, { fecha_chequeo: null }))).toBeNull();
    expect(await resolverAsignacion(null)).toBeNull();
    expect(db.sequelize.query).not.toHaveBeenCalled();
  });

  test('error de BD → null, nunca lanza', async () => {
    bd.error = Object.assign(new Error('boom'), { name: 'SequelizeDatabaseError', original: { code: 'ER_NO_SUCH_TABLE' } });
    await expect(resolverAsignacion(base)).resolves.toBeNull();
    expect(console.warn.mock.calls[0][0]).toMatch(/ERROR tareaId=7 error=SequelizeDatabaseError\/ER_NO_SUCH_TABLE/);
  });
});

describe('asignacionDeLineaPev (línea supervisor)', () => {
  test('un único asignacionId en las líneas PEV → ese valor; ninguno → null; dos distintos → null', async () => {
    bd.lineas = [{ asignacionId: 40 }];
    expect(await asignacionDeLineaPev({ tareaId: 7, listaPevId: 9 })).toBe(40);
    bd.lineas = [];
    expect(await asignacionDeLineaPev({ tareaId: 7, listaSuperId: 5 })).toBeNull();
    bd.lineas = [{ asignacionId: 40 }, { asignacionId: 41 }];
    expect(await asignacionDeLineaPev({ tareaId: 7, listaPevId: 9 })).toBeNull();
  });

  test('por listaSuperId cruza listas_super_trabajadores; error → null', async () => {
    bd.lineas = [{ asignacionId: 40 }];
    await asignacionDeLineaPev({ tareaId: 7, listaSuperId: 5 });
    expect(db.sequelize.query.mock.calls[0][0]).toMatch(/JOIN linea_lista_pev_trabajadores l ON l\.listasPevTrabajadoreId = st\.listasPevTrabajadoreId WHERE st\.id = :id/);
    bd.error = new Error('boom');
    await expect(asignacionDeLineaPev({ tareaId: 7, listaPevId: 9 })).resolves.toBeNull();
  });
});
