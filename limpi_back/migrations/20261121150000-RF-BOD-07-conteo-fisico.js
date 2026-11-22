'use strict';

/**
 * RF-BOD-07 — Conteo físico de inventario y ajustes aprobados (retroalimentación Sumativa 2).
 * Un conteo guarda el stock teórico al crearse (snapshot) y lo contado; al aprobarlo, cada diferencia genera un
 * AJUSTE en el kardex (movimiento_id). Tablas nuevas, sin backfill.
 * Reversión: aborta si existen conteos APROBADO (sus ajustes ya están en el kardex).
 */

const CABECERA = 'inventario_conteos';
const ITEMS = 'inventario_conteo_items';

async function existe(queryInterface, tabla) {
  return queryInterface.describeTable(tabla).then(function () { return true; }, function () { return false; });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await existe(queryInterface, CABECERA))) {
      await queryInterface.createTable(CABECERA, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        fecha: { type: Sequelize.DATE, allowNull: false },
        // Sin FK: el usuario puede venir de usuarios o trabajadores (igual que movimientos_bodega)
        responsable_id: { type: Sequelize.INTEGER, allowNull: true },
        contexto_usuario: { type: Sequelize.STRING(20), allowNull: true },
        // BORRADOR | APROBADO | ANULADO
        estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'BORRADOR' },
        aprobado_por: { type: Sequelize.INTEGER, allowNull: true },
        aprobado_at: { type: Sequelize.DATE, allowNull: true },
        observacion: { type: Sequelize.STRING(255), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex(CABECERA, ['estado'], { name: 'idx_inventario_conteos_estado' });
    }
    if (!(await existe(queryInterface, ITEMS))) {
      await queryInterface.createTable(ITEMS, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        conteo_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: CABECERA, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        producto_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'productos', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        cantidad_teorica: { type: Sequelize.INTEGER, allowNull: false },
        // NULL = aún no contado
        cantidad_contada: { type: Sequelize.INTEGER, allowNull: true },
        // contada − teórica mientras es BORRADOR; contada − stock al aprobar (el ajuste real)
        diferencia: { type: Sequelize.INTEGER, allowNull: true },
        motivo: { type: Sequelize.STRING(255), allowNull: true },
        movimiento_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'movimientos_bodega', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        }
      });
      await queryInterface.addIndex(ITEMS, ['conteo_id', 'producto_id'], { name: 'uq_inventario_conteo_items_producto', unique: true });
    }
  },

  down: async (queryInterface, Sequelize) => {
    if (await existe(queryInterface, CABECERA)) {
      const filas = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS n FROM ' + CABECERA + ' WHERE estado = :estado',
        { replacements: { estado: 'APROBADO' }, type: Sequelize.QueryTypes.SELECT });
      const aprobados = Number(filas[0].n);
      if (aprobados > 0) {
        throw new Error('[RF-BOD-07] reversión abortada: ' + aprobados + ' conteos aprobados con ajustes en el kardex. Sin cambios.');
      }
    }
    await queryInterface.dropTable(ITEMS);
    await queryInterface.dropTable(CABECERA);
  }
};
