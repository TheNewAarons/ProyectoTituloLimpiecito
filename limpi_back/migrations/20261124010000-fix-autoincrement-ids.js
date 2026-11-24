'use strict';

/**
 * Fix — `cc_ingresos`, `cajas` y `acceso_clientes` tienen `id INT NOT NULL` sin AUTO_INCREMENT (esquema original):
 * todo INSERT sin id falla con "Column 'id' cannot be null" (p. ej. crear ingreso de centro de costo).
 * Subida: agrega AUTO_INCREMENT solo donde falta (idempotente; no toca datos, MySQL continúa desde MAX(id)+1).
 * Reversión: quita AUTO_INCREMENT, dejando el esquema como estaba.
 */

const TABLAS = ['cc_ingresos', 'cajas', 'acceso_clientes'];

async function esAutoIncremental(queryInterface, tabla) {
  const [filas] = await queryInterface.sequelize.query(
    "SELECT EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = 'id'",
    { replacements: { t: tabla } }
  );
  return filas.length > 0 && /auto_increment/i.test(filas[0].extra);
}

// `cajas.id` es referenciado por FKs (centro_costos, egresos): MySQL rechaza el MODIFY salvo con FOREIGN_KEY_CHECKS=0.
// El tipo no cambia, así que las FKs siguen siendo válidas. La transacción fija una sola conexión para el SET.
async function modificarIds(queryInterface, autoIncremental) {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
    try {
      for (const tabla of TABLAS) {
        if ((await esAutoIncremental(queryInterface, tabla)) === autoIncremental) continue;
        await queryInterface.sequelize.query(
          'ALTER TABLE ' + tabla + ' MODIFY id INT NOT NULL' + (autoIncremental ? ' AUTO_INCREMENT' : ''),
          { transaction: t }
        );
      }
    } finally {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });
    }
  });
}

module.exports = {
  up: (queryInterface) => modificarIds(queryInterface, true),
  down: (queryInterface) => modificarIds(queryInterface, false)
};
