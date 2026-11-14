'use strict';

/**
 * RF-BOD-05 — Stock mínimo por producto para las alertas del dashboard de bodega.
 * - Solo agrega `productos.stock_minimo INT NOT NULL DEFAULT 0`. Con 0 ningún producto existente entra en
 *   alerta (regla: alerta si stock_minimo > 0 y stock <= stock_minimo), así que el comportamiento no cambia.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): verifica antes de aplicar.
 * - Reversión: aborta si algún producto ya tiene stock_minimo > 0 (se perderían mínimos cargados).
 */

const TABLA = 'productos';
const COLUMNA = 'stock_minimo';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas[COLUMNA]) {
      await queryInterface.addColumn(TABLA, COLUMNA, { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    }
    console.log('[RF-BOD-05] ' + TABLA + '.' + COLUMNA + ' lista (DEFAULT 0)');
  },

  down: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas[COLUMNA]) return;
    const filas = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS n FROM ' + TABLA + ' WHERE ' + COLUMNA + ' > 0', { type: Sequelize.QueryTypes.SELECT });
    const n = Number(filas[0].n);
    if (n > 0) {
      throw new Error('[RF-BOD-05] reversión abortada: ' + n + ' productos tienen ' + COLUMNA + ' > 0 (se perderían los mínimos cargados).');
    }
    await queryInterface.removeColumn(TABLA, COLUMNA);
  }
};
