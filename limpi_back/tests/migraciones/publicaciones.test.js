/**
 * RF-WEB-03 — Migración 20261114130000: up crea `publicaciones` (idempotente); down aborta si hay filas.
 */
const migracion = require('../../migrations/20261114130000-RF-WEB-03-publicaciones');

const Sequelize = {
  INTEGER: 'INTEGER', STRING: n => 'STRING(' + n + ')', TEXT: 'TEXT', DATE: 'DATE', BOOLEAN: 'BOOLEAN',
  literal: s => s, QueryTypes: { SELECT: 'SELECT' }
};
// existe: la tabla ya está creada; filas: COUNT(*) de publicaciones
function queryInterface(existe, filas, indices) {
  return {
    createTable: jest.fn(async () => {}),
    dropTable: jest.fn(async () => {}),
    showIndex: jest.fn(async () => indices || []),
    addIndex: jest.fn(async () => {}),
    sequelize: {
      query: jest.fn(async sql => [{ n: /information_schema/.test(sql) ? (existe ? 1 : 0) : filas }])
    }
  };
}

let log;
beforeAll(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => log.mockRestore());

it('up crea la tabla con columnas, default publicado=0, timestamps e índice compuesto', async () => {
  const qi = queryInterface(false, 0);
  await migracion.up(qi, Sequelize);
  const [tabla, cols, opciones] = qi.createTable.mock.calls[0];
  expect(tabla).toBe('publicaciones');
  expect(cols.titulo).toEqual({ type: 'STRING(150)', allowNull: false });
  expect(cols.cuerpo).toEqual({ type: 'TEXT', allowNull: false });
  expect(cols.imagen).toEqual({ type: 'STRING(255)', allowNull: true });
  expect(cols.fecha_publicacion).toEqual({ type: 'DATE', allowNull: false });
  expect(cols.fecha_expiracion).toEqual({ type: 'DATE', allowNull: true });
  expect(cols.publicado).toEqual({ type: 'BOOLEAN', allowNull: false, defaultValue: false });
  expect(cols.created_at.allowNull).toBe(false);
  expect(cols.updated_at.allowNull).toBe(false);
  expect(opciones).toEqual({ engine: 'InnoDB', charset: 'utf8mb4' });
  expect(qi.addIndex).toHaveBeenCalledWith('publicaciones', ['publicado', 'fecha_publicacion', 'fecha_expiracion'],
    { name: 'publicaciones_vigentes_idx' });
});

it('up es idempotente', async () => {
  const qi = queryInterface(true, 0, [{ name: 'publicaciones_vigentes_idx' }]);
  await migracion.up(qi, Sequelize);
  expect(qi.createTable).not.toHaveBeenCalled();
  expect(qi.addIndex).not.toHaveBeenCalled();
});

it('down aborta si la tabla tiene filas', async () => {
  const qi = queryInterface(true, 3);
  await expect(migracion.down(qi, Sequelize)).rejects.toThrow(/reversión abortada: publicaciones tiene 3 filas/);
  expect(qi.dropTable).not.toHaveBeenCalled();
});

it('down elimina la tabla vacía', async () => {
  const qi = queryInterface(true, 0);
  await migracion.down(qi, Sequelize);
  expect(qi.dropTable).toHaveBeenCalledWith('publicaciones');
});
