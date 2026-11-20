'use strict';

/**
 * RF-WEB-01b — Vínculo opcional de un ítem del catálogo web con un servicio de la app de reservas.
 * - Columna nueva `catalogo_items.servicio_id` (NULL = ítem propio de la web; es el valor de todos los existentes).
 * - FK a `servicios(id)` con ON DELETE SET NULL: borrar un servicio de la app solo desvincula el ítem.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): verifica columna y constraint antes de crearlos.
 * - Reversión: quita la constraint y la columna (los vínculos se pierden; los ítems y sus datos quedan).
 */

const TABLA = 'catalogo_items';
const COLUMNA = 'servicio_id';
const FK = 'catalogo_items_servicio_id_fk';

async function existeConstraint(queryInterface, Sequelize) {
  const filas = await queryInterface.sequelize.query(
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :fk',
    { replacements: { tabla: TABLA, fk: FK }, type: Sequelize.QueryTypes.SELECT });
  return Number(filas[0].n) > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas[COLUMNA]) {
      await queryInterface.addColumn(TABLA, COLUMNA, { type: Sequelize.INTEGER, allowNull: true, defaultValue: null });
    }
    if (!(await existeConstraint(queryInterface, Sequelize))) {
      await queryInterface.addConstraint(TABLA, [COLUMNA], {
        type: 'foreign key',
        name: FK,
        references: { table: 'servicios', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
    console.log('[RF-WEB-01b] ' + TABLA + '.' + COLUMNA + ' lista');
  },

  down: async (queryInterface, Sequelize) => {
    if (await existeConstraint(queryInterface, Sequelize)) await queryInterface.removeConstraint(TABLA, FK);
    const columnas = await queryInterface.describeTable(TABLA);
    if (columnas[COLUMNA]) await queryInterface.removeColumn(TABLA, COLUMNA);
  }
};
