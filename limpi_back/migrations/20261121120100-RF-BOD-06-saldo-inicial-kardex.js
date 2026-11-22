'use strict';

/**
 * RF-BOD-06 — Saldo inicial del kardex valorizado (D-175, D-176).
 * Un movimiento SALDO_INICIAL por producto: punto de partida conocido para reconstruir stock y valor.
 * - Stock = productos.stock tal cual (NULL cuenta 0). Un negativo se copia para que la conciliación lo muestre;
 *   productos.stock NO se modifica (D-054).
 * - Costo: último costo de compra; si no hay, productos.precio (mismo criterio que entrega.js), marcado en `motivo`.
 *   Valor = MAX(stock, 0) × costo.
 * - Idempotente: omite productos que ya tienen SALDO_INICIAL.
 * - Reversión: borra solo los SALDO_INICIAL de esta migración y aborta si algún producto ya tiene movimientos
 *   posteriores (el kardex quedaría sin punto de partida).
 */

const TIPO = 'SALDO_INICIAL';
const REFERENCIA = 'migracion_RF-BOD-06';

async function consultar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, { replacements: replacements || {}, type: Sequelize.QueryTypes.SELECT });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable('movimientos_bodega');
    if (!columnas.valor_saldo_resultante) {
      throw new Error('[RF-BOD-06] abortado sin cambios: falta la migración de columnas del kardex');
    }

    // Una sola sentencia: atómica aunque el DDL previo haya hecho autocommit
    const contar = async () => Number((await consultar(queryInterface, Sequelize,
      'SELECT COUNT(*) AS n FROM movimientos_bodega WHERE tipo = :tipo', { tipo: TIPO }))[0].n);
    const antes = await contar();
    await queryInterface.sequelize.query(
      'INSERT INTO movimientos_bodega (producto_id, tipo, cantidad, referencia_tipo, usuario_id, contexto_usuario, ' +
      'stock_anterior, stock_resultante, costo_unitario, valor_movimiento, valor_saldo_anterior, valor_saldo_resultante, ' +
      'motivo, estado, created_at) ' +
      'SELECT p.id, :tipo, COALESCE(p.stock, 0), :referencia, NULL, \'SISTEMA\', 0, COALESCE(p.stock, 0), ' +
      'COALESCE(p.costo_unitario, p.precio, 0), ' +
      'GREATEST(COALESCE(p.stock, 0), 0) * COALESCE(p.costo_unitario, p.precio, 0), 0, ' +
      'GREATEST(COALESCE(p.stock, 0), 0) * COALESCE(p.costo_unitario, p.precio, 0), ' +
      'CASE WHEN p.costo_unitario IS NOT NULL THEN \'Saldo inicial a último costo de compra\' ' +
      'WHEN p.precio IS NOT NULL THEN \'Saldo inicial a costo estimado (productos.precio)\' ' +
      'ELSE \'Saldo inicial sin costo\' END, ' +
      '\'CONFIRMADO\', NOW() ' +
      'FROM productos p ' +
      'WHERE NOT EXISTS (SELECT 1 FROM movimientos_bodega m WHERE m.producto_id = p.id AND m.tipo = :tipo) ' +
      'ORDER BY p.id',
      { replacements: { tipo: TIPO, referencia: REFERENCIA } }
    );
    const insertados = (await contar()) - antes;

    const r = (await consultar(queryInterface, Sequelize,
      'SELECT SUM(stock < 0) AS negativos, SUM(stock IS NULL) AS nulos, ' +
      'SUM(costo_unitario IS NULL AND precio IS NOT NULL) AS estimados, ' +
      'SUM(costo_unitario IS NULL AND precio IS NULL) AS sin_costo FROM productos'))[0];
    console.log('[RF-BOD-06] SALDO_INICIAL insertados: ' + insertados +
      ' | productos con stock negativo: ' + Number(r.negativos || 0) + ', NULL: ' + Number(r.nulos || 0) +
      ' | costo estimado (precio): ' + Number(r.estimados || 0) + ', sin costo: ' + Number(r.sin_costo || 0) +
      ' (conciliación manual)');
  },

  down: async (queryInterface, Sequelize) => {
    const posteriores = Number((await consultar(queryInterface, Sequelize,
      'SELECT COUNT(*) AS n FROM movimientos_bodega m JOIN movimientos_bodega s ' +
      'ON s.producto_id = m.producto_id AND s.tipo = :tipo AND s.referencia_tipo = :referencia AND m.id > s.id',
      { tipo: TIPO, referencia: REFERENCIA }))[0].n);
    if (posteriores > 0) {
      throw new Error('[RF-BOD-06] reversión abortada: ' + posteriores + ' movimientos posteriores al saldo inicial. ' +
        'El kardex quedaría sin punto de partida. Sin cambios.');
    }
    await queryInterface.sequelize.query(
      'DELETE FROM movimientos_bodega WHERE tipo = :tipo AND referencia_tipo = :referencia',
      { replacements: { tipo: TIPO, referencia: REFERENCIA } }
    );
  }
};
