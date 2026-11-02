'use strict';

/**
 * RF-BOD-01 — Solicitudes de insumos/EPP del supervisor (Docs/bodega-solicitudes.md).
 * Solo crea tablas nuevas: `solicitudes_bodega` y `solicitud_items`. No altera tablas existentes.
 * - Pre-checks ANTES de cualquier DDL (abortan sin cambios): tablas referenciadas existen y son InnoDB.
 * - Las FK usan el COLUMN_TYPE real de cada `id` referenciado (int(11), int unsigned, etc.) para que
 *   MySQL/MariaDB acepten la restricción sin depender de cómo se creó el esquema.
 * - Idempotente/reanudable (MySQL hace autocommit del DDL): cada paso verifica antes de aplicar.
 * - estado VARCHAR(20) y no ENUM: RF-BOD-02 puede usar PARCIAL/LISTA_ENTREGA sin cambiar la columna.
 * - Reversión: aborta si hay solicitudes (registros de bodega no se borran físicamente, spec 2.4).
 */

const SOLICITUDES = 'solicitudes_bodega';
const ITEMS = 'solicitud_items';
const REFERENCIADAS = ['trabajadores', 'usuarios', 'centro_costos', 'productos'];

const INDICES = [
  { tabla: SOLICITUDES, name: 'idx_solicitudes_bodega_estado', fields: ['estado', 'created_at'] },
  { tabla: SOLICITUDES, name: 'idx_solicitudes_bodega_trabajador', fields: ['trabajador_id', 'created_at'] },
  { tabla: SOLICITUDES, name: 'idx_solicitudes_bodega_centro', fields: ['centro_costo_id'] },
  { tabla: ITEMS, name: 'uq_solicitud_items_producto', fields: ['solicitud_id', 'producto_id'], unique: true },
  { tabla: ITEMS, name: 'idx_solicitud_items_producto', fields: ['producto_id'] }
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

// { trabajadores: 'int(11)', ... } o error si falta alguna tabla o no es InnoDB.
async function tiposReferenciados(queryInterface, Sequelize) {
  const filas = await consultar(queryInterface, Sequelize,
    'SELECT t.TABLE_NAME AS tabla, t.ENGINE AS motor, c.COLUMN_TYPE AS tipo ' +
    'FROM information_schema.TABLES t JOIN information_schema.COLUMNS c ' +
    'ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = \'id\' ' +
    'WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME IN (:tablas)',
    { tablas: REFERENCIADAS });
  const tipos = {};
  filas.forEach(function (f) {
    if (String(f.motor).toLowerCase() !== 'innodb') {
      throw new Error('[RF-BOD-01] abortado sin cambios: la tabla ' + f.tabla + ' usa ' + f.motor + ' (se requiere InnoDB para las FK)');
    }
    tipos[f.tabla] = f.tipo;
  });
  REFERENCIADAS.forEach(function (t) {
    if (!tipos[t]) throw new Error('[RF-BOD-01] abortado sin cambios: falta la tabla ' + t + ' o su columna id');
  });
  return tipos;
}

function fk(tipo, tabla, allowNull) {
  return {
    type: tipo,
    allowNull: allowNull,
    references: { model: tabla, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  };
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tipos = await tiposReferenciados(queryInterface, Sequelize);

    if (!(await tablaExiste(queryInterface, Sequelize, SOLICITUDES))) {
      await queryInterface.createTable(
        SOLICITUDES,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          // Supervisor (login /acces_laboral, token con id de trabajadores). NULL si la crea un usuario admin.
          trabajador_id: fk(tipos.trabajadores, 'trabajadores', true),
          // Usuario admin/operaciones que la creó. NULL si la creó un supervisor.
          usuario_id: fk(tipos.usuarios, 'usuarios', true),
          centro_costo_id: fk(tipos.centro_costos, 'centro_costos', false),
          estado: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDIENTE' },
          observacion: { type: Sequelize.STRING(500), allowNull: true },
          entregada_at: { type: Sequelize.DATE, allowNull: true },
          anulada_at: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        },
        { engine: 'InnoDB', charset: 'utf8mb4' }
      );
    }

    if (!(await tablaExiste(queryInterface, Sequelize, ITEMS))) {
      await queryInterface.createTable(
        ITEMS,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          solicitud_id: fk(Sequelize.INTEGER, SOLICITUDES, false),
          producto_id: fk(tipos.productos, 'productos', false),
          cantidad_pedida: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
          // Los completa el cruce de stock (RF-BOD-02). faltante NULL = aún no cruzado.
          cantidad_asignada: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
          cantidad_faltante: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        },
        { engine: 'InnoDB', charset: 'utf8mb4' }
      );
    }

    for (const indice of INDICES) {
      const existentes = (await queryInterface.showIndex(indice.tabla)).map(function (i) { return i.name; });
      if (existentes.indexOf(indice.name) === -1) {
        await queryInterface.addIndex(indice.tabla, indice.fields, { name: indice.name, unique: !!indice.unique });
      }
    }

    console.log('[RF-BOD-01] tablas ' + SOLICITUDES + ' y ' + ITEMS + ' listas');
  },

  down: async (queryInterface, Sequelize) => {
    if (await tablaExiste(queryInterface, Sequelize, SOLICITUDES)) {
      const filas = await consultar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM ' + SOLICITUDES);
      const n = Number(filas[0].n);
      if (n > 0) {
        throw new Error(
          '[RF-BOD-01] reversión abortada: ' + SOLICITUDES + ' tiene ' + n + ' filas. Los registros de bodega no se ' +
          'borran físicamente: respaldar y renombrar manualmente (decisión humana).'
        );
      }
    }
    if (await tablaExiste(queryInterface, Sequelize, ITEMS)) await queryInterface.dropTable(ITEMS);
    if (await tablaExiste(queryInterface, Sequelize, SOLICITUDES)) await queryInterface.dropTable(SOLICITUDES);
  }
};
