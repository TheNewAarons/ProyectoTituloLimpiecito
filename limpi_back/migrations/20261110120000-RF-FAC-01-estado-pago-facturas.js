'use strict';

/**
 * RF-FAC-01 — Estado de pago en facturas (ingresos y egresos).
 * Tablas reales (Docs/RECONOCIMIENTO.md): no existe `ingresos`; ingresos = `cc_ingresos`,
 * egresos = `egresos` (caja) y `cc_egresos` (centro de costo).
 * MySQL hace autocommit del DDL: cada paso verifica antes de aplicar (idempotente/reanudable).
 * - Existentes -> 'PAGADA' en el mismo ALTER (DEFAULT 'PAGADA' preserva el histórico).
 * - fecha_pago = DATE(fecha): `fecha` es un día calendario guardado a medianoche/10:00 UTC (verificado en BD local).
 * - down: aborta si hay filas con estado distinto de 'PAGADA' (se perdería el estado de facturas nuevas).
 */

const TABLAS = ['cc_ingresos', 'egresos', 'cc_egresos'];
const ESTADOS = ['PENDIENTE', 'PAGADA', 'ANULADA'];
const TIPOS_DOC = ['FACTURA', 'BOLETA', 'OTRO'];

function idxEstado(tabla) { return 'idx_' + tabla + '_estado_pago'; }
function idxFechaPago(tabla) { return 'idx_' + tabla + '_fecha_pago'; }

async function seleccionar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, {
    replacements: replacements || {},
    type: Sequelize.QueryTypes.SELECT
  });
}

async function indiceExiste(queryInterface, tabla, nombre) {
  const indices = await queryInterface.showIndex(tabla);
  return indices.some(i => i.name === nombre);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tabla of TABLAS) {
      // 1. Columnas
      const columnas = await queryInterface.describeTable(tabla);
      if (!columnas.fecha) throw new Error('[RF-FAC-01] pre-check: ' + tabla + '.fecha no existe. Abortado.');
      const nuevas = {
        tipo_documento: { type: Sequelize.ENUM.apply(null, TIPOS_DOC), allowNull: true },
        numero_documento: { type: Sequelize.STRING(30), allowNull: true },
        fecha_emision: { type: Sequelize.DATEONLY, allowNull: true },
        fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: true },
        estado_pago: { type: Sequelize.ENUM.apply(null, ESTADOS), allowNull: false, defaultValue: 'PAGADA' },
        fecha_pago: { type: Sequelize.DATEONLY, allowNull: true }
      };
      for (const col of Object.keys(nuevas)) {
        if (!columnas[col]) await queryInterface.addColumn(tabla, col, nuevas[col]);
      }

      // 2. Backfill: DATE(fecha), no conversión a Santiago: `fecha` guarda un día calendario
      // (00:00 o 10:00 UTC); convertir correría al día anterior las filas de 00:00.
      await queryInterface.sequelize.query(
        'UPDATE ' + tabla + ' SET fecha_pago = DATE(fecha) ' + // tabla de constante fija
          "WHERE fecha_pago IS NULL AND fecha IS NOT NULL AND estado_pago = 'PAGADA'"
      );

      // 3. Índices (RNF-BI-01: filtros por estado y por mes de pago)
      if (!(await indiceExiste(queryInterface, tabla, idxEstado(tabla)))) {
        await queryInterface.addIndex(tabla, ['estado_pago'], { name: idxEstado(tabla) });
      }
      if (!(await indiceExiste(queryInterface, tabla, idxFechaPago(tabla)))) {
        await queryInterface.addIndex(tabla, ['fecha_pago'], { name: idxFechaPago(tabla) });
      }

      // 4. Conteos (sin datos personales)
      const c = (await seleccionar(
        queryInterface,
        Sequelize,
        "SELECT COUNT(*) AS total, SUM(estado_pago = 'PAGADA') AS pagadas, SUM(fecha_pago IS NULL) AS sin_fecha_pago FROM " +
          tabla
      ))[0];
      console.log('[RF-FAC-01] ' + tabla + ' total=' + Number(c.total) + ' pagadas=' + Number(c.pagadas || 0) +
        ' sin_fecha_pago=' + Number(c.sin_fecha_pago || 0));
    }
  },

  down: async (queryInterface, Sequelize) => {
    for (const tabla of TABLAS) {
      const columnas = await queryInterface.describeTable(tabla);
      if (!columnas.estado_pago) continue;
      const n = Number((await seleccionar(
        queryInterface,
        Sequelize,
        "SELECT COUNT(*) AS n FROM " + tabla + " WHERE estado_pago <> 'PAGADA'" // tabla de constante fija
      ))[0].n);
      if (n > 0) {
        throw new Error('[RF-FAC-01] down abortado: ' + n + ' filas de ' + tabla + ' con estado distinto de PAGADA. ' +
          'Se perdería el estado de facturas pendientes/anuladas. Respaldar y conciliar manualmente primero.');
      }
    }

    for (const tabla of TABLAS) {
      for (const nombre of [idxEstado(tabla), idxFechaPago(tabla)]) {
        if (await indiceExiste(queryInterface, tabla, nombre)) await queryInterface.removeIndex(tabla, nombre);
      }
      // En MySQL el ENUM es parte de la columna: removeColumn lo elimina (no hay tipo aparte).
      const actuales = await queryInterface.describeTable(tabla);
      const quitar = ['fecha_pago', 'estado_pago', 'fecha_vencimiento', 'fecha_emision', 'numero_documento', 'tipo_documento'];
      for (const col of quitar) {
        if (actuales[col]) await queryInterface.removeColumn(tabla, col);
      }
    }
  }
};
