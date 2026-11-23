'use strict';

/**
 * RF-BOD-06 — Kardex valorizado (retroalimentación Sumativa 2, D-175, D-176).
 * 100% aditiva sobre `movimientos_bodega`: columnas de saldo, costo y valor, vínculo de reversa y estado.
 * - Filas históricas: columnas nuevas en NULL (no se inventan saldos) y estado 'CONFIRMADO'.
 *   El kardex valorizado arranca con el SALDO_INICIAL de la migración siguiente.
 * - Montos CLP enteros DECIMAL(14,0); el costo promedio se deriva de valor_saldo / stock (D-176).
 * - La fecha efectiva es `created_at` (el movimiento se registra cuando ocurre; no hay carga retroactiva).
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): cada paso verifica antes de aplicar.
 * - Reversión: aborta si alguna columna nueva ya tiene datos (registros de bodega no se pierden).
 */

const TABLA = 'movimientos_bodega';
const FK_REVERSA = 'fk_movimientos_bodega_revertido';
const IDX_SALDO = 'idx_movimientos_bodega_producto_id';

function columnas(Sequelize) {
  return {
    stock_anterior: { type: Sequelize.INTEGER, allowNull: true },
    stock_resultante: { type: Sequelize.INTEGER, allowNull: true },
    // Costo unitario aplicado y congelado en el movimiento
    costo_unitario: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
    // Con signo, igual que cantidad: salida negativa
    valor_movimiento: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
    valor_saldo_anterior: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
    valor_saldo_resultante: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
    // Línea del documento de origen (recepcion_items, inventario_conteo_items, solicitud_items)
    referencia_linea_id: { type: Sequelize.INTEGER, allowNull: true },
    motivo: { type: Sequelize.STRING(255), allowNull: true },
    movimiento_revertido_id: { type: Sequelize.INTEGER, allowNull: true },
    estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'CONFIRMADO' }
  };
}

async function consultar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
}

async function existeConstraint(queryInterface, Sequelize, nombre) {
  const filas = await consultar(queryInterface, Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS ' +
    'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :nombre',
    { tabla: TABLA, nombre: nombre });
  return Number(filas[0].n) > 0;
}

async function nombresIndices(queryInterface) {
  return (await queryInterface.showIndex(TABLA)).map(function (i) { return i.name; });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const actuales = await queryInterface.describeTable(TABLA); // falla sin cambios si la tabla no existe
    const nuevas = columnas(Sequelize);
    for (const nombre of Object.keys(nuevas)) {
      if (!actuales[nombre]) await queryInterface.addColumn(TABLA, nombre, nuevas[nombre]);
    }

    // Último saldo por producto: WHERE producto_id = ? ORDER BY id DESC LIMIT 1
    if ((await nombresIndices(queryInterface)).indexOf(IDX_SALDO) === -1) {
      await queryInterface.addIndex(TABLA, ['producto_id', 'id'], { name: IDX_SALDO });
    }
    if (!(await existeConstraint(queryInterface, Sequelize, FK_REVERSA))) {
      await queryInterface.addConstraint(TABLA, ['movimiento_revertido_id'], {
        type: 'foreign key',
        name: FK_REVERSA,
        references: { table: TABLA, field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
    }

    const conteo = await consultar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM ' + TABLA);
    console.log('[RF-BOD-06] ' + TABLA + ' valorizada. Movimientos históricos sin saldo: ' + Number(conteo[0].n));
  },

  down: async (queryInterface, Sequelize) => {
    const actuales = await queryInterface.describeTable(TABLA);
    const presentes = Object.keys(columnas(Sequelize)).filter(function (c) { return actuales[c]; });

    // Pre-check antes de cualquier DDL: columnas fijas del código, sin entrada externa
    const condiciones = presentes.map(function (c) {
      return c === 'estado' ? "estado <> 'CONFIRMADO'" : c + ' IS NOT NULL';
    });
    if (condiciones.length) {
      const filas = await consultar(queryInterface, Sequelize,
        'SELECT COUNT(*) AS n FROM ' + TABLA + ' WHERE ' + condiciones.join(' OR '));
      const n = Number(filas[0].n);
      if (n > 0) {
        throw new Error('[RF-BOD-06] reversión abortada: ' + n + ' movimientos ya tienen saldo/costo/reversa. ' +
          'Los registros de bodega no se pierden: respaldar y decidir manualmente. Sin cambios.');
      }
    }

    if (await existeConstraint(queryInterface, Sequelize, FK_REVERSA)) {
      await queryInterface.removeConstraint(TABLA, FK_REVERSA);
    }
    const indices = await nombresIndices(queryInterface);
    // MySQL crea un índice con el nombre de la FK para movimiento_revertido_id
    if (indices.indexOf(FK_REVERSA) !== -1) await queryInterface.removeIndex(TABLA, FK_REVERSA);
    if (indices.indexOf(IDX_SALDO) !== -1) await queryInterface.removeIndex(TABLA, IDX_SALDO);
    for (const nombre of presentes.reverse()) {
      await queryInterface.removeColumn(TABLA, nombre);
    }
  }
};
