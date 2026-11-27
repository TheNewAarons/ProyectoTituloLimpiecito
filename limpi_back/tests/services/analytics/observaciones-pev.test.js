/**
 * Retroalimentación de la revisión — texto de las observaciones PEV de un sector (services/analytics/observaciones-pev.js).
 */
jest.mock('../../../database/database', () => ({ sequelize: { query: jest.fn(), QueryTypes: { SELECT: 'SELECT' } } }));

const db = require('../../../database/database');
// Analytics ahora carga modelos al iniciarse (Configuracion en RF-BI-01): modelos de mentira, aquí no se usan.
db.sequelize.define = () => new Proxy({}, { get: () => () => {} });
const { listar, armar } = require('../../../services/analytics/observaciones-pev');

const personas = {
  porId: { 4: { id: 4, nombre: 'Ana', apellido: 'Rojas', n_empleado: 1004 } },
  porN: { 1004: { id: 4, nombre: 'Ana', apellido: 'Rojas' }, 2001: { id: 9, nombre: 'Juan', apellido: 'Contreras' } }
};

describe('armar', () => {
  it('une trabajador y supervisor, identifica al autor y ordena por fecha descendente', () => {
    const r = armar(
      [{ fecha: '2026-11-05', trabajador_id: 4, observaciones: ' Piso mojado ', area: 'Lobby', tarea: 'Trapeado', lista_id: '10' }],
      [{ fecha: '2026-11-10', supervisor_n: 2001, observaciones: 'Vidrios con marcas', area: 'Hall', tarea: 'Vidrios', lista_id: 11 },
        { fecha: '2026-11-01', supervisor_n: 7777, observaciones: 'Sin jabón', area: null, tarea: null, lista_id: 12 }],
      personas
    );
    expect(r.map((x) => [x.fecha, x.origen, x.autor, x.texto])).toEqual([
      ['2026-11-10', 'SUPERVISOR', 'Juan Contreras', 'Vidrios con marcas'],
      ['2026-11-05', 'TRABAJADOR', 'Ana Rojas', 'Piso mojado'],
      ['2026-11-01', 'SUPERVISOR', 'Supervisor N° 7777', 'Sin jabón']
    ]);
    expect(r[1].lista_id).toBe(10);
  });
});

describe('listar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sector_id es obligatorio y entero positivo (400) sin consultar la BD', async () => {
    for (const s of [undefined, '', 'abc', '0', '-3', '1;DROP']) {
      await expect(listar({ sector_id: s })).rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
    }
    expect(db.sequelize.query).not.toHaveBeenCalled();
  });

  it('consulta solo ese sector y con texto, y devuelve el total en meta', async () => {
    db.sequelize.query.mockResolvedValue([]);
    const r = await listar({ sector_id: '3', desde: '2026-09', hasta: '2026-11' });
    const sqls = db.sequelize.query.mock.calls.map((c) => c[0]);
    expect(sqls[0]).toMatch(/lp\.sectoreId = :sector AND TRIM\(COALESCE\(l\.observaciones/);
    expect(sqls[1]).toMatch(/lp\.sectoreId = :sector AND TRIM\(COALESCE\(ls\.observaciones/);
    expect(db.sequelize.query.mock.calls[0][1].replacements.sector).toBe(3);
    expect(r.meta).toMatchObject({ sector_id: 3, desde: '2026-09', hasta: '2026-11', total: 0 });
  });
});
