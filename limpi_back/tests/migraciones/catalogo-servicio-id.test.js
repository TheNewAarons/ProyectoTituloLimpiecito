/**
 * RF-WEB-01b — Migración 20261120003306: servicio_id opcional con FK ON DELETE SET NULL; idempotente y reversible.
 */
const migracion = require('../../migrations/20261120003306-RF-WEB-01b-catalogo-servicio-id');

const Sequelize = { INTEGER: 'INTEGER', QueryTypes: { SELECT: 'SELECT' } };
function queryInterface(tieneColumna, tieneFk) {
  return {
    describeTable: jest.fn(async () => (tieneColumna ? { servicio_id: {} } : { id: {} })),
    addColumn: jest.fn(async () => {}),
    addConstraint: jest.fn(async () => {}),
    removeConstraint: jest.fn(async () => {}),
    removeColumn: jest.fn(async () => {}),
    sequelize: { query: jest.fn(async () => [{ n: tieneFk ? 1 : 0 }]) }
  };
}

let log;
beforeAll(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => log.mockRestore());

it('up agrega la columna nullable y la FK con SET NULL', async () => {
  const qi = queryInterface(false, false);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).toHaveBeenCalledWith('catalogo_items', 'servicio_id', { type: 'INTEGER', allowNull: true, defaultValue: null });
  expect(qi.addConstraint.mock.calls[0][2]).toMatchObject({ type: 'foreign key', name: 'catalogo_items_servicio_id_fk', references: { table: 'servicios', field: 'id' }, onDelete: 'SET NULL' });
});

it('up es idempotente', async () => {
  const qi = queryInterface(true, true);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).not.toHaveBeenCalled();
  expect(qi.addConstraint).not.toHaveBeenCalled();
});

it('la reversión quita la FK y luego la columna', async () => {
  const qi = queryInterface(true, true);
  await migracion.down(qi, Sequelize);
  expect(qi.removeConstraint).toHaveBeenCalledWith('catalogo_items', 'catalogo_items_servicio_id_fk');
  expect(qi.removeColumn).toHaveBeenCalledWith('catalogo_items', 'servicio_id');
});
