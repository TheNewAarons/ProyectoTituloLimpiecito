'use strict';

/**
 * RNF-ARQ-01 (cierre D-ARQ-01-1) — Anulación de entradas de stock rápido en vez del borrado físico.
 * Columnas nuevas en NULL: todas las entradas existentes siguen activas (comportamiento histórico).
 * Reversión: aborta si hay entradas anuladas (su REVERSA ya está en el kardex; quitar la marca las haría ver activas).
 */

const TABLA = 'stock_rapidos';
const COLUMNAS = ['anulada_at', 'anulada_por', 'contexto_anulacion', 'motivo_anulacion'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const actuales = await queryInterface.describeTable(TABLA);
    const nuevas = {
      anulada_at: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
      // Sin FK: el usuario puede venir de usuarios o trabajadores (igual que movimientos_bodega)
      anulada_por: { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
      contexto_anulacion: { type: Sequelize.STRING(20), allowNull: true, defaultValue: null },
      motivo_anulacion: { type: Sequelize.STRING(255), allowNull: true, defaultValue: null }
    };
    for (const c of COLUMNAS) {
      if (!actuales[c]) await queryInterface.addColumn(TABLA, c, nuevas[c]);
    }
  },

  down: async (queryInterface) => {
    const actuales = await queryInterface.describeTable(TABLA);
    if (actuales.anulada_at) {
      const [filas] = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM ' + TABLA + ' WHERE anulada_at IS NOT NULL');
      if (Number(filas[0].n) > 0) {
        throw new Error('hay ' + filas[0].n + ' entradas de stock rápido anuladas: revertir esta migración las mostraría como activas');
      }
    }
    for (const c of COLUMNAS.slice().reverse()) {
      if (actuales[c]) await queryInterface.removeColumn(TABLA, c);
    }
  }
};
