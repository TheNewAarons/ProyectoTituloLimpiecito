/**
 * RF-WEB-01 — Migración 20261119020439: up crea `catalogo_items` (idempotente); la reversión aborta si hay filas.
 */
const migracion = require('../../migrations/20261119020439-RF-WEB-01-catalogo-items');

const Sequelize = {
  INTEGER: 'INTEGER', STRING: (n) => 'STRING(' + n + ')', TEXT: 'TEXT', DATE: 'DATE', BOOLEAN: 'BOOLEAN',
  DECIMAL: (p, s) => 'DECIMAL(' + p + ',' + s + ')', literal: (s) => s, QueryTypes: { SELECT: 'SELECT' }
};
function queryInterface(existe, filas, indices) {
  return {
    createTable: jest.fn(async () => {}),
    dropTable: jest.fn(async () => {}),
    showIndex: jest.fn(async () => indices || []),
    addIndex: jest.fn(async () => {}),
    sequelize: { query: jest.fn(async (sql) => [{ n: /information_schema/.test(sql) ? (existe ? 1 : 0) : filas }]) }
  };
}

let log;
beforeAll(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => log.mockRestore());

it('up crea la tabla con precio DECIMAL(14,0), publicado=false, orden=0 e índice', async () => {
  const qi = queryInterface(false, 0);
  await migracion.up(qi, Sequelize);
  const [tabla, cols] = qi.createTable.mock.calls[0];
  expect(tabla).toBe('catalogo_items');
  expect(cols.nombre).toEqual({ type: 'STRING(150)', allowNull: false });
  expect(cols.precio).toEqual({ type: 'DECIMAL(14,0)', allowNull: true });
  expect(cols.publicado).toEqual({ type: 'BOOLEAN', allowNull: false, defaultValue: false });
  expect(cols.orden).toEqual({ type: 'INTEGER', allowNull: false, defaultValue: 0 });
  expect(qi.addIndex).toHaveBeenCalledWith('catalogo_items', ['publicado', 'orden'], { name: 'catalogo_items_publicado_orden_idx' });
});

it('up es idempotente: si la tabla y el índice existen no hace nada', async () => {
  const qi = queryInterface(true, 0, [{ name: 'catalogo_items_publicado_orden_idx' }]);
  await migracion.up(qi, Sequelize);
  expect(qi.createTable).not.toHaveBeenCalled();
  expect(qi.addIndex).not.toHaveBeenCalled();
});

it('la reversión borra la tabla vacía y aborta si tiene filas', async () => {
  const vacia = queryInterface(true, 0);
  await migracion.down(vacia, Sequelize);
  expect(vacia.dropTable).toHaveBeenCalledWith('catalogo_items');
  const conFilas = queryInterface(true, 3);
  await expect(migracion.down(conFilas, Sequelize)).rejects.toThrow(/3 filas/);
  expect(conFilas.dropTable).not.toHaveBeenCalled();
});
