'use strict';

/**
 * RF-BI-01 — Tabla clave/valor `configuracion` + parámetro `bi.umbral_utilidad_baja` (CLP entero, default 0).
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): crea la tabla solo si no existe; inserta la fila solo si falta.
 * - Reversión: borra la fila; elimina la tabla solo si queda vacía (si otro proceso agregó claves, la tabla se conserva).
 */

const TABLA = 'configuracion';
const CLAVE = 'bi.umbral_utilidad_baja';

async function contar(queryInterface, Sequelize, sql, replacements) {
  const filas = await queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
  return Number(filas[0].n);
}

function existeTabla(queryInterface, Sequelize) {
  return contar(queryInterface, Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla',
    { tabla: TABLA }).then(function (n) { return n > 0; });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await existeTabla(queryInterface, Sequelize))) {
      await queryInterface.createTable(TABLA, {
        clave: { type: Sequelize.STRING(80), primaryKey: true, allowNull: false },
        valor: { type: Sequelize.STRING(255), allowNull: false },
        descripcion: { type: Sequelize.STRING(255), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      }, { engine: 'InnoDB', charset: 'utf8mb4' });
    }
    // nombre de tabla de la constante fija, sin entrada externa
    const n = await contar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM `' + TABLA + '` WHERE clave = :clave', { clave: CLAVE });
    if (n === 0) {
      await queryInterface.sequelize.query(
        'INSERT INTO `' + TABLA + '` (clave, valor, descripcion) VALUES (:clave, :valor, :descripcion)',
        { replacements: {
          clave: CLAVE,
          valor: '0',
          descripcion: 'Umbral de utilidad mensual en CLP (entero). El dashboard alerta si la utilidad real o proyectada es menor a este valor.'
        } });
    }
    console.log('[RF-BI-01] tabla ' + TABLA + ' lista con ' + CLAVE);
  },

  down: async (queryInterface, Sequelize) => {
    if (!(await existeTabla(queryInterface, Sequelize))) return;
    await queryInterface.sequelize.query('DELETE FROM `' + TABLA + '` WHERE clave = :clave', { replacements: { clave: CLAVE } });
    const restantes = await contar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM `' + TABLA + '`');
    if (restantes === 0) await queryInterface.dropTable(TABLA);
  }
};
