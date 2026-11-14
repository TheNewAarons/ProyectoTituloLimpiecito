'use strict';

/**
 * RF-WEB-03 — Publicaciones del portal web (tabla nueva; la legacy `anuncios` no se toca).
 * - Tabla nueva: sin datos históricos; `publicado` nace en 0 (borrador).
 * - Timestamps created_at/updated_at como proveedores/ordenes_compra (RF-BOD-03).
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): verifica antes de aplicar.
 * - Reversión: aborta si la tabla tiene filas (se perderían publicaciones).
 */

const TABLA = 'publicaciones';
const INDICE = 'publicaciones_vigentes_idx';

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
        titulo: { type: Sequelize.STRING(150), allowNull: false },
        cuerpo: { type: Sequelize.TEXT, allowNull: false },
        imagen: { type: Sequelize.STRING(255), allowNull: true },
        fecha_publicacion: { type: Sequelize.DATE, allowNull: false },
        fecha_expiracion: { type: Sequelize.DATE, allowNull: true },
        publicado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { engine: 'InnoDB', charset: 'utf8mb4' });
    }
    const indices = await queryInterface.showIndex(TABLA);
    if (!indices.some(function (i) { return i.name === INDICE; })) {
      await queryInterface.addIndex(TABLA, ['publicado', 'fecha_publicacion', 'fecha_expiracion'], { name: INDICE });
    }
    console.log('[RF-WEB-03] tabla ' + TABLA + ' lista');
  },

  down: async (queryInterface, Sequelize) => {
    if (!(await existeTabla(queryInterface, Sequelize))) return;
    // nombre de tabla de la constante fija, sin entrada externa
    const filas = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS n FROM `' + TABLA + '`', { type: Sequelize.QueryTypes.SELECT });
    const n = Number(filas[0].n);
    if (n > 0) {
      throw new Error('[RF-WEB-03] reversión abortada: ' + TABLA + ' tiene ' + n + ' filas (se perderían publicaciones).');
    }
    await queryInterface.dropTable(TABLA);
  }
};
