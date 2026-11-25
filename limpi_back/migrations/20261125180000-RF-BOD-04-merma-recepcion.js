'use strict';

/**
 * RF-BOD-04 (merma en recepción) — Unidades rechazadas al recibir (dañadas, faltantes que no se reponen).
 * orden_compra_items.cantidad_rechazada: caché como cantidad_recibida; pendiente = cantidad - recibida - rechazada.
 * recepcion_items.cantidad_rechazada + motivo_rechazo: el rechazo queda en la recepción que lo registró.
 * DEFAULT 0: las órdenes existentes conservan su pendiente (comportamiento histórico).
 * Reversión: aborta si hay rechazos registrados (quitarlos reabriría saldos ya cerrados).
 */

const COLUMNAS = {
  orden_compra_items: ['cantidad_rechazada'],
  recepcion_items: ['cantidad_rechazada', 'motivo_rechazo']
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const definicion = {
      cantidad_rechazada: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      motivo_rechazo: { type: Sequelize.STRING(255), allowNull: true, defaultValue: null }
    };
    for (const tabla of Object.keys(COLUMNAS)) {
      const actuales = await queryInterface.describeTable(tabla);
      for (const c of COLUMNAS[tabla]) {
        if (!actuales[c]) await queryInterface.addColumn(tabla, c, definicion[c]);
      }
    }
  },

  down: async (queryInterface) => {
    for (const tabla of Object.keys(COLUMNAS)) {
      const actuales = await queryInterface.describeTable(tabla);
      if (!actuales.cantidad_rechazada) continue;
      const [filas] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM ' + tabla + ' WHERE cantidad_rechazada > 0');
      if (Number(filas[0].n) > 0) {
        throw new Error('hay ' + filas[0].n + ' lineas con unidades rechazadas en ' + tabla + ': revertir esta migración reabriría sus saldos');
      }
    }
    for (const tabla of Object.keys(COLUMNAS)) {
      const actuales = await queryInterface.describeTable(tabla);
      for (const c of COLUMNAS[tabla].slice().reverse()) {
        if (actuales[c]) await queryInterface.removeColumn(tabla, c);
      }
    }
  }
};
