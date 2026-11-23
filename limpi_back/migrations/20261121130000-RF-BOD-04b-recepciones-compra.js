'use strict';

/**
 * RF-BOD-04b — Recepciones de compra como eventos (retroalimentación Sumativa 2, P-3).
 * Cada recepción de una OC es una cabecera (documento, fecha) con sus líneas; cada línea queda enlazada a su
 * ENTRADA_COMPRA del kardex. orden_compra_items.cantidad_recibida se mantiene como caché.
 * - Backfill (P-3, aproximación declarada): una recepción `historica = 1` por orden con unidades recibidas,
 *   fecha = ordenes_compra.updated_at, una línea por item con cantidad_recibida > 0 al costo de la línea.
 *   movimiento_id queda NULL: los movimientos anteriores no tienen línea de recepción.
 * - Idempotente: omite órdenes que ya tienen recepción histórica.
 * - Reversión: aborta si existen recepciones no históricas (registros de bodega no se pierden).
 */

const CABECERA = 'recepciones_compra';
const ITEMS = 'recepcion_items';

async function consultar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
}

async function existe(queryInterface, tabla) {
  return queryInterface.describeTable(tabla).then(function () { return true; }, function () { return false; });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await existe(queryInterface, CABECERA))) {
      await queryInterface.createTable(CABECERA, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        orden_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'ordenes_compra', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        fecha_recepcion: { type: Sequelize.DATE, allowNull: false },
        // GUIA | FACTURA (validado en el controlador); NULL en recepciones históricas
        documento_tipo: { type: Sequelize.STRING(10), allowNull: true },
        documento_numero: { type: Sequelize.STRING(50), allowNull: true },
        observacion: { type: Sequelize.STRING(255), allowNull: true },
        estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'CONFIRMADA' },
        historica: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        // Sin FK: el usuario puede venir de usuarios o trabajadores (igual que movimientos_bodega)
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        contexto_usuario: { type: Sequelize.STRING(20), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(CABECERA, ['orden_id'], { name: 'idx_recepciones_compra_orden' });
    }
    if (!(await existe(queryInterface, ITEMS))) {
      await queryInterface.createTable(ITEMS, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        recepcion_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: CABECERA, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        orden_item_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'orden_compra_items', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        producto_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        cantidad: { type: Sequelize.INTEGER, allowNull: false },
        // CLP entero: costo real de la recepción (puede diferir del de la OC)
        costo_unitario: { type: Sequelize.DECIMAL(14, 0), allowNull: true },
        movimiento_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'movimientos_bodega', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        }
      });
      await queryInterface.addIndex(ITEMS, ['orden_item_id'], { name: 'idx_recepcion_items_orden_item' });
    }

    // Backfill P-3. Sentencias simples y parametrizadas; la cabecera se inserta antes que sus líneas.
    const ordenes = await consultar(queryInterface, Sequelize,
      'SELECT o.id, o.updated_at, o.created_by FROM ordenes_compra o ' +
      'WHERE EXISTS (SELECT 1 FROM orden_compra_items i WHERE i.orden_id = o.id AND i.cantidad_recibida > 0) ' +
      'AND NOT EXISTS (SELECT 1 FROM ' + CABECERA + ' r WHERE r.orden_id = o.id AND r.historica = 1) ORDER BY o.id');
    for (const o of ordenes) {
      await queryInterface.sequelize.query(
        'INSERT INTO ' + CABECERA + ' (orden_id, fecha_recepcion, observacion, estado, historica, created_by, contexto_usuario, created_at) ' +
        'VALUES (:orden, :fecha, :obs, \'CONFIRMADA\', 1, :usuario, \'SISTEMA\', NOW())',
        { replacements: { orden: o.id, fecha: o.updated_at, obs: 'Recepción histórica (aproximación, migración RF-BOD-04b)', usuario: o.created_by } });
      await queryInterface.sequelize.query(
        'INSERT INTO ' + ITEMS + ' (recepcion_id, orden_item_id, producto_id, cantidad, costo_unitario) ' +
        'SELECT r.id, i.id, i.producto_id, i.cantidad_recibida, i.costo_unitario FROM orden_compra_items i ' +
        'JOIN ' + CABECERA + ' r ON r.orden_id = i.orden_id AND r.historica = 1 ' +
        'WHERE i.orden_id = :orden AND i.cantidad_recibida > 0 ORDER BY i.id',
        { replacements: { orden: o.id } });
    }
    console.log('[RF-BOD-04b] recepciones históricas creadas: ' + ordenes.length);
  },

  down: async (queryInterface, Sequelize) => {
    if (await existe(queryInterface, CABECERA)) {
      const reales = Number((await consultar(queryInterface, Sequelize,
        'SELECT COUNT(*) AS n FROM ' + CABECERA + ' WHERE historica = 0'))[0].n);
      if (reales > 0) {
        throw new Error('[RF-BOD-04b] reversión abortada: ' + reales + ' recepciones registradas después de la migración. Sin cambios.');
      }
    }
    await queryInterface.dropTable(ITEMS);
    await queryInterface.dropTable(CABECERA);
  }
};
