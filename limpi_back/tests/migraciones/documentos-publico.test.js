/**
 * RF-WEB-02 — Migración 20261114120000: up agrega publico/fecha_publicacion (idempotente); down aborta si hay publicados.
 */
const migracion = require('../../migrations/20261114120000-RF-WEB-02-documentos-publico');

const Sequelize = { BOOLEAN: 'BOOLEAN', DATE: 'DATE', QueryTypes: { SELECT: 'SELECT' } };
function queryInterface(columnas, publicados, indices) {
  return {
    describeTable: jest.fn(async () => columnas),
    showIndex: jest.fn(async () => indices || []),
    addColumn: jest.fn(async () => {}),
    addIndex: jest.fn(async () => {}),
    removeIndex: jest.fn(async () => {}),
    removeColumn: jest.fn(async () => {}),
    sequelize: { query: jest.fn(async () => [{ n: publicados }]) }
  };
}

let log;
beforeAll(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => log.mockRestore());

it('up agrega publico NOT NULL DEFAULT false, fecha_publicacion NULL e índice', async () => {
  const qi = queryInterface({ id: {} }, 0);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).toHaveBeenCalledWith('documentos', 'publico', { type: 'BOOLEAN', allowNull: false, defaultValue: false });
  expect(qi.addColumn).toHaveBeenCalledWith('documentos', 'fecha_publicacion', { type: 'DATE', allowNull: true });
  expect(qi.addIndex).toHaveBeenCalledWith('documentos', ['publico'], { name: 'documentos_publico_idx' });
});

it('up es idempotente', async () => {
  const qi = queryInterface({ publico: {}, fecha_publicacion: {} }, 0, [{ name: 'documentos_publico_idx' }]);
  await migracion.up(qi, Sequelize);
  expect(qi.addColumn).not.toHaveBeenCalled();
  expect(qi.addIndex).not.toHaveBeenCalled();
});

it('down aborta si hay documentos publicados', async () => {
  const qi = queryInterface({ publico: {}, fecha_publicacion: {} }, 2);
  await expect(migracion.down(qi, Sequelize)).rejects.toThrow(/reversión abortada: 2 documentos/);
  expect(qi.removeColumn).not.toHaveBeenCalled();
});

it('down quita índice y ambas columnas si no hay publicados', async () => {
  const qi = queryInterface({ publico: {}, fecha_publicacion: {} }, 0, [{ name: 'documentos_publico_idx' }]);
  await migracion.down(qi, Sequelize);
  expect(qi.removeIndex).toHaveBeenCalledWith('documentos', 'documentos_publico_idx');
  expect(qi.removeColumn).toHaveBeenCalledWith('documentos', 'publico');
  expect(qi.removeColumn).toHaveBeenCalledWith('documentos', 'fecha_publicacion');
});
