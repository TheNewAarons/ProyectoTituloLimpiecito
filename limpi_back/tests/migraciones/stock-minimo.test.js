/**
 * RF-BOD-05 — Migración 20261113162840: up agrega la columna (idempotente); down aborta si hay stock_minimo > 0.
 */
const migracion = require('../../migrations/20261113162840-RF-BOD-05-stock-minimo');

const Sequelize = { INTEGER: 'INTEGER', QueryTypes: { SELECT: 'SELECT' } };
function queryInterface(columnas, conMinimo) {
  return {
    describeTable: jest.fn(async () => columnas),
    addColumn: jest.fn(async () => {}),
    removeColumn: jest.fn(async () => {}),
    sequelize: { query: jest.fn(async () => [{ n: conMinimo }]) }
  };
}

let log;
beforeAll(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => log.mockRestore());

it('up agrega stock_minimo INT NOT NULL DEFAULT 0', async () => {
  const qi = queryInterface({ id: {} }, 0);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).toHaveBeenCalledWith('productos', 'stock_minimo', { type: 'INTEGER', allowNull: false, defaultValue: 0 });
});

it('up es idempotente: si la columna existe no la vuelve a crear', async () => {
  const qi = queryInterface({ stock_minimo: {} }, 0);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).not.toHaveBeenCalled();
});

it('down aborta si algún producto tiene stock_minimo > 0', async () => {
  const qi = queryInterface({ stock_minimo: {} }, 3);
  await expect(migracion.down(qi, Sequelize)).rejects.toThrow(/reversión abortada: 3 productos/);
  expect(qi.removeColumn).not.toHaveBeenCalled();
});

it('down quita la columna si todos los mínimos están en 0', async () => {
  const qi = queryInterface({ stock_minimo: {} }, 0);
  await migracion.down(qi, Sequelize);
  expect(qi.removeColumn).toHaveBeenCalledWith('productos', 'stock_minimo');
});
