'use strict';

/**
 * Fix D-180 — `centro_costo_trabajadores.liquidacioneId` apuntaba a `centro_costos.id` (error del esquema
 * original): crear una liquidación cuyo id supera el máximo de `centro_costos` fallaba por FK.
 * Subida: aborta si hay filas con una liquidación inexistente (no se tocan datos). Reemplaza la FK.
 * Reversión: restaura la FK original sin validar filas (FOREIGN_KEY_CHECKS=0), como estaba en el esquema previo.
 */

const TABLA = 'centro_costo_trabajadores';
const COLUMNA = 'liquidacioneId';
const NUEVA = 'centro_costo_trabajadores_liquidacione_fk';

async function fksDeColumna(queryInterface) {
  const [filas] = await queryInterface.sequelize.query(
    'SELECT CONSTRAINT_NAME AS nombre, REFERENCED_TABLE_NAME AS tabla FROM information_schema.KEY_COLUMN_USAGE ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c AND REFERENCED_TABLE_NAME IS NOT NULL',
    { replacements: { t: TABLA, c: COLUMNA } }
  );
  return filas;
}

module.exports = {
  up: async (queryInterface) => {
    const actuales = await fksDeColumna(queryInterface);
    if (actuales.some((f) => f.tabla === 'liquidaciones')) return;
    const [huerfanas] = await queryInterface.sequelize.query(
      'SELECT c.id, c.liquidacioneId FROM ' + TABLA + ' c LEFT JOIN liquidaciones l ON l.id = c.liquidacioneId ' +
        'WHERE c.liquidacioneId IS NOT NULL AND l.id IS NULL LIMIT 50'
    );
    if (huerfanas.length) {
      throw new Error('hay filas de ' + TABLA + ' con liquidacioneId inexistente (corregir antes de migrar): ' + JSON.stringify(huerfanas));
    }
    for (const f of actuales) await queryInterface.removeConstraint(TABLA, f.nombre);
    await queryInterface.addConstraint(TABLA, [COLUMNA], {
      type: 'foreign key',
      name: NUEVA,
      references: { table: 'liquidaciones', field: 'id' },
      onDelete: 'restrict',
      onUpdate: 'restrict'
    });
  },

  down: async (queryInterface) => {
    const actuales = await fksDeColumna(queryInterface);
    if (actuales.some((f) => f.tabla === 'centro_costos')) return;
    for (const f of actuales) await queryInterface.removeConstraint(TABLA, f.nombre);
    // La FK original no es válida para los datos actuales: se recrea sin validar, igual que estaba.
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
      await queryInterface.sequelize.query(
        'ALTER TABLE ' + TABLA + ' ADD CONSTRAINT centro_costo_trabajadores_ibfk_3 FOREIGN KEY (' + COLUMNA + ') REFERENCES centro_costos (id)',
        { transaction: t }
      );
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
    });
  }
};
