'use strict';

/**
 * RF-WEB-02 — Portal de PDFs públicos: marca de publicación en `documentos`.
 * - Agrega `publico BOOLEAN NOT NULL DEFAULT false` (+ índice) y `fecha_publicacion DATETIME NULL`.
 *   Con DEFAULT false ningún documento existente queda público; el legacy /documento_web
 *   (filtra por categoria.tipo='Publico') no se toca.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): verifica antes de aplicar.
 * - Reversión: aborta si algún documento ya está publicado (se perdería el estado de publicación).
 */

const TABLA = 'documentos';
const INDICE = 'documentos_publico_idx';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (!columnas.publico) {
      await queryInterface.addColumn(TABLA, 'publico', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
    if (!columnas.fecha_publicacion) {
      await queryInterface.addColumn(TABLA, 'fecha_publicacion', { type: Sequelize.DATE, allowNull: true });
    }
    const indices = await queryInterface.showIndex(TABLA);
    if (!indices.some(function (i) { return i.name === INDICE; })) {
      await queryInterface.addIndex(TABLA, ['publico'], { name: INDICE });
    }
    console.log('[RF-WEB-02] ' + TABLA + '.publico (DEFAULT false) y fecha_publicacion listas');
  },

  down: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);
    if (columnas.publico) {
      const filas = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS n FROM ' + TABLA + ' WHERE publico = 1', { type: Sequelize.QueryTypes.SELECT });
      const n = Number(filas[0].n);
      if (n > 0) {
        throw new Error('[RF-WEB-02] reversión abortada: ' + n + ' documentos están publicados (se perdería el estado de publicación).');
      }
      const indices = await queryInterface.showIndex(TABLA);
      if (indices.some(function (i) { return i.name === INDICE; })) {
        await queryInterface.removeIndex(TABLA, INDICE);
      }
      await queryInterface.removeColumn(TABLA, 'publico');
    }
    if (columnas.fecha_publicacion) {
      await queryInterface.removeColumn(TABLA, 'fecha_publicacion');
    }
  }
};
