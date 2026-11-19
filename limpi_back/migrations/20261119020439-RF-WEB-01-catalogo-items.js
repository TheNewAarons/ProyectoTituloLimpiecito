'use strict';

/**
 * RF-WEB-01 — Catálogo comercial publicable en la web (tabla nueva, independiente de bodega y de la app).
 * - Sin datos históricos; `publicado` nace en 0 (borrador) y `orden` en 0.
 * - Precio CLP opcional como DECIMAL(14,0).
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): verifica antes de aplicar.
 * - Reversión: aborta si la tabla tiene filas (se perderían ítems del catálogo).
 */

const TABLA = 'catalogo_items';
const INDICE = 'catalogo_items_publicado_orden_idx';

async function existeTabla(queryInterface, Sequelize) {
  const filas = await queryInterface.sequelize.query(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla',
    { replacements: { tabla: TABLA }, type: Sequelize.QueryTypes.SELECT });
  return Number(filas[0].n) > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await existeTabla(queryInterface, Sequelize))) {
      await queryInterface.createTable(TABLA, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        categoria: { type: Sequelize.STRING(80), allowNull: true },
        imagen: { type: Sequelize.STRING(255), allowNull: true },
        precio: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        publicado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { engine: 'InnoDB', charset: 'utf8mb4' });
    }
    const indices = await queryInterface.showIndex(TABLA);
    if (!indices.some(function (i) { return i.name === INDICE; })) {
      await queryInterface.addIndex(TABLA, ['publicado', 'orden'], { name: INDICE });
    }
    console.log('[RF-WEB-01] tabla ' + TABLA + ' lista');
  },

  down: async (queryInterface, Sequelize) => {
    if (!(await existeTabla(queryInterface, Sequelize))) return;
    // nombre de tabla de la constante fija, sin entrada externa
    const filas = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS n FROM `' + TABLA + '`', { type: Sequelize.QueryTypes.SELECT });
    const n = Number(filas[0].n);
    if (n > 0) {
      throw new Error('[RF-WEB-01] reversión abortada: ' + TABLA + ' tiene ' + n + ' filas (se perderían ítems del catálogo).');
    }
    await queryInterface.dropTable(TABLA);
  }
};
