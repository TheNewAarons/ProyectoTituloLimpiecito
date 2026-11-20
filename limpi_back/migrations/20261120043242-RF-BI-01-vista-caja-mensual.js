'use strict';

/**
 * RF-BI-01 — Vista `v_bi_caja_mensual`: una fila por caja (periodo 'YYYY-MM', UNIQUE uq_cajas_periodo).
 * - utilidad_caja = saldo_final - saldo_inicial; NULL en la caja abierta (estado 1, saldo_final NULL):
 *   el mes abierto lo calcula calcularSaldo() en el servicio, no esta vista.
 * - estado: 1 = abierta, 0 = cerrada (modelo Caja). Sin CTE (compatible MySQL 5.7).
 * - Solo lectura; reversión: DROP VIEW IF EXISTS (no toca datos).
 */

const VISTA = 'v_bi_caja_mensual';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      // INVOKER: la vista no depende de que exista el usuario que corrio la migracion en RDS
      'CREATE OR REPLACE SQL SECURITY INVOKER VIEW `' + VISTA + '` AS ' +
      'SELECT c.id AS caja_id, c.periodo, c.estado, c.saldo_inicial, c.saldo_final, ' +
      'c.total_ingreso, c.total_egreso, ' +
      '(c.saldo_final - c.saldo_inicial) AS utilidad_caja, ' +
      'c.saldo_provisional ' +
      'FROM cajas c');
    console.log('[RF-BI-01] vista ' + VISTA + ' lista');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS `' + VISTA + '`');
  }
};
