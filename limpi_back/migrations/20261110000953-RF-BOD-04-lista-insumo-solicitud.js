'use strict';

/**
 * RF-BOD-04 — Vincula cada solicitud entregada con la lista de insumos que registró su consumo en el
 * centro de costo (Docs/bodega-solicitudes.md, "RF-BOD-04").
 * - Solo agrega `solicitudes_bodega.lista_insumo_id` (NULL: las solicitudes existentes no cambian) + FK.
 * - FK RESTRICT hacia `lista_insumos.id` con el COLUMN_TYPE real del id referenciado.
 * - Pre-checks antes del DDL (abortan sin cambios): tablas InnoDB y `lista_insumos.id` existente.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): cada paso verifica antes de aplicar.
 * - Reversión: aborta si alguna solicitud ya tiene lista asociada (no se pierde la trazabilidad).
 */

const TABLA = 'solicitudes_bodega';
const COLUMNA = 'lista_insumo_id';
const FK = 'fk_solicitudes_bodega_lista_insumo';
const IDX = 'idx_solicitudes_bodega_lista_insumo';

async function consultar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
}

async function fkExiste(queryInterface, Sequelize) {
  const filas = await consultar(queryInterface, Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND CONSTRAINT_NAME = :fk',
    { t: TABLA, fk: FK });
  return Number(filas[0].n) > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const filas = await consultar(queryInterface, Sequelize,
      'SELECT t.TABLE_NAME AS tabla, t.ENGINE AS motor, c.COLUMN_TYPE AS tipo FROM information_schema.TABLES t ' +
      'LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = \'id\' ' +
      'WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME IN (:tablas)',
      { tablas: [TABLA, 'lista_insumos'] });
    const info = filas.reduce((m, f) => { m[f.tabla] = f; return m; }, {});
    [TABLA, 'lista_insumos'].forEach((t) => {
      if (!info[t] || !info[t].tipo) throw new Error('[RF-BOD-04] abortado sin cambios: falta la tabla ' + t + ' o su columna id');
      if (String(info[t].motor).toLowerCase() !== 'innodb') throw new Error('[RF-BOD-04] abortado sin cambios: ' + t + ' no es InnoDB');
    });

    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas[COLUMNA]) {
      await queryInterface.addColumn(TABLA, COLUMNA, { type: info.lista_insumos.tipo, allowNull: true });
    }
    const indices = (await queryInterface.showIndex(TABLA)).map((i) => i.name);
    if (indices.indexOf(IDX) === -1) {
      await queryInterface.addIndex(TABLA, [COLUMNA], { name: IDX });
    }
    if (!(await fkExiste(queryInterface, Sequelize))) {
      await queryInterface.addConstraint(TABLA, [COLUMNA], {
        type: 'foreign key', name: FK, references: { table: 'lista_insumos', field: 'id' }, onDelete: 'restrict', onUpdate: 'cascade'
      });
    }
    console.log('[RF-BOD-04] ' + TABLA + '.' + COLUMNA + ' lista (FK RESTRICT a lista_insumos)');
  },

  down: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas[COLUMNA]) return;
    const usadas = await consultar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM ' + TABLA + ' WHERE ' + COLUMNA + ' IS NOT NULL');
    if (Number(usadas[0].n) > 0) {
      throw new Error('[RF-BOD-04] reversión abortada: ' + usadas[0].n + ' solicitudes ya tienen lista de insumos asociada (se perdería la trazabilidad).');
    }
    if (await fkExiste(queryInterface, Sequelize)) await queryInterface.removeConstraint(TABLA, FK);
    const indices = (await queryInterface.showIndex(TABLA)).map((i) => i.name);
    if (indices.indexOf(IDX) !== -1) await queryInterface.removeIndex(TABLA, IDX);
    await queryInterface.removeColumn(TABLA, COLUMNA);
  }
};
