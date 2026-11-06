'use strict';

/**
 * RF-BOD-02 — Kardex de stock `movimientos_bodega` (TASK_PLAN.md §9, D-052, D-054, D-055, D-059).
 * 100% aditiva: solo crea la tabla nueva y sus índices. NO altera `productos` ni ninguna otra tabla.
 * - Pre-checks ANTES de cualquier DDL: `productos` existe, es InnoDB, y se usa su COLUMN_TYPE real para la FK.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): cada paso verifica antes de aplicar.
 * - tipo VARCHAR(30) validado en el servicio, no ENUM (D-052). cantidad INT con signo = delta al stock (D-055).
 * - usuario_id sin FK + contexto_usuario: actor puede ser supervisor (trabajadores) o usuario (D-059).
 * - productos.stock no se toca (D-054): solo se reportan conteos de NULL/negativos para conciliación manual.
 * - Reversión: aborta si hay movimientos (registros de bodega no se borran físicamente, spec 2.4).
 */

const TABLA = 'movimientos_bodega';

const INDICES = [
  { name: 'idx_movimientos_bodega_producto', fields: ['producto_id', 'created_at'] },
  { name: 'idx_movimientos_bodega_referencia', fields: ['referencia_tipo', 'referencia_id'] }
];

async function consultar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
}

async function tablaExiste(queryInterface, Sequelize, tabla) {
  const filas = await consultar(queryInterface, Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla',
    { tabla: tabla });
  return Number(filas[0].n) > 0;
}

// COLUMN_TYPE real de productos.id o error si falta la tabla o no es InnoDB.
async function tipoProductoId(queryInterface, Sequelize) {
  const filas = await consultar(queryInterface, Sequelize,
    'SELECT t.ENGINE AS motor, c.COLUMN_TYPE AS tipo ' +
    'FROM information_schema.TABLES t JOIN information_schema.COLUMNS c ' +
    'ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = \'id\' ' +
    'WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME = :tabla',
    { tabla: 'productos' });
  if (!filas.length) throw new Error('[RF-BOD-02] abortado sin cambios: falta la tabla productos o su columna id');
  if (String(filas[0].motor).toLowerCase() !== 'innodb') {
    throw new Error('[RF-BOD-02] abortado sin cambios: la tabla productos usa ' + filas[0].motor + ' (se requiere InnoDB para la FK)');
  }
  return filas[0].tipo;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tipoProducto = await tipoProductoId(queryInterface, Sequelize);

    if (!(await tablaExiste(queryInterface, Sequelize, TABLA))) {
      await queryInterface.createTable(
        TABLA,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          producto_id: {
            type: tipoProducto,
            allowNull: false,
            references: { model: 'productos', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          tipo: { type: Sequelize.STRING(30), allowNull: false },
          // Delta con signo aplicado al stock: salida negativa, entrada/reversa positiva.
          cantidad: { type: Sequelize.INTEGER, allowNull: false },
          referencia_tipo: { type: Sequelize.STRING(40), allowNull: true },
          referencia_id: { type: Sequelize.INTEGER, allowNull: true },
          usuario_id: { type: Sequelize.INTEGER, allowNull: true },
          contexto_usuario: { type: Sequelize.STRING(30), allowNull: false },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        },
        { engine: 'InnoDB', charset: 'utf8mb4' }
      );
    }

    const existentes = (await queryInterface.showIndex(TABLA)).map(function (i) { return i.name; });
    for (const indice of INDICES) {
      if (existentes.indexOf(indice.name) === -1) {
        await queryInterface.addIndex(TABLA, indice.fields, { name: indice.name });
      }
    }

    const conteo = await consultar(queryInterface, Sequelize,
      'SELECT SUM(stock IS NULL) AS nulos, SUM(stock < 0) AS negativos FROM productos');
    console.log('[RF-BOD-02] tabla ' + TABLA + ' lista. productos con stock NULL: ' + Number(conteo[0].nulos || 0) +
      ', negativo: ' + Number(conteo[0].negativos || 0) + ' (no se corrigen, conciliación manual)');
  },

  down: async (queryInterface, Sequelize) => {
    if (!(await tablaExiste(queryInterface, Sequelize, TABLA))) return;
    const filas = await consultar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM ' + TABLA);
    const n = Number(filas[0].n);
    if (n > 0) {
      throw new Error(
        '[RF-BOD-02] reversión abortada: ' + TABLA + ' tiene ' + n + ' filas. Los registros de bodega no se ' +
        'borran físicamente: respaldar y renombrar manualmente (decisión humana).'
      );
    }
    await queryInterface.dropTable(TABLA);
  }
};
