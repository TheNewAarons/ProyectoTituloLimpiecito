/**
 * RF-BI-03 criterio «datos desde el primer día de uso del flujo nuevo»: el filtro de Analytics arranca en el mes de la
 * primera solicitud de bodega (en America/Santiago) y esa solicitud entra a las agregaciones.
 */
const mockQuery = jest.fn();
jest.mock('../../../database/database', () => ({ sequelize: { query: mockQuery, QueryTypes: { SELECT: 'SELECT' } } }));

const periodos = require('../../../services/analytics/periodos');

describe('primer periodo de bodega', () => {
  // Primera solicitud: 1 dic 2025 00:30 en Santiago (UTC-3) = 03:30 UTC.
  const PRIMERA = new Date('2025-12-01T03:30:00Z');

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockImplementation((sql) => Promise.resolve([{ minimo: /solicitudes_bodega/.test(sql) ? PRIMERA : null }]));
  });

  it('el filtro parte en el mes de la primera solicitud no anulada, calculado en Santiago', async () => {
    const r = await periodos.primerosPeriodos();
    expect(r.bodega).toBe('2025-12');
    const sql = mockQuery.mock.calls.map((c) => c[0]).filter((s) => /solicitudes_bodega/.test(s))[0];
    expect(sql).toMatch(/estado <> :anulada/);
  });
});
