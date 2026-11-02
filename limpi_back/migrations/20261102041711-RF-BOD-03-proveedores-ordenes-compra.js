'use strict';

/**
 * RF-BOD-03 — Proveedores y órdenes de compra (spec "Modelo de datos del módulo").
 * MySQL hace autocommit del DDL: cada tabla se crea solo si no existe (idempotente/reanudable).
 * - Tablas nuevas: no hay datos históricos que preservar; estado nace 'BORRADOR'.
 * - orden_compra_items.producto_id SIN FK: productos_bodega aún no existe en el repo (tabla de otro
 *   integrante, en pausa por coordinación). Agregar la FK en una migración posterior.
 * - created_by -> usuarios.id (tipo copiado), SET NULL para no bloquear el legacy si borra usuarios.
 * - down: aborta si alguna tabla tiene filas (registros de bodega no se borran físicamente).
 */

const T_PROVEEDORES = 'proveedores';
const T_ORDENES = 'ordenes_compra';
const T_ITEMS = 'orden_compra_items';
const ESTADOS = ['BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'ANULADA'];

async function seleccionar(queryInterface, Sequelize, sql, replacements) {
  return queryInterface.sequelize.query(sql, {
    replacements: replacements || {},
    type: Sequelize.QueryTypes.SELECT
  });
}

async function motores(queryInterface, Sequelize, tablas) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT TABLE_NAME AS tabla, ENGINE AS motor FROM information_schema.TABLES ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (:tablas)',
    { tablas: tablas }
  );
  const mapa = {};
  filas.forEach(f => { mapa[f.tabla] = f.motor; });
  return mapa;
}

async function tipoColumnaId(queryInterface, Sequelize, tabla) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT DATA_TYPE AS dataType, COLUMN_TYPE AS columnType FROM information_schema.COLUMNS ' +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = 'id'",
    { tabla: tabla }
  );
  if (!filas.length) throw new Error('[RF-BOD-03] pre-check: ' + tabla + '.id no existe');
  const dataType = String(filas[0].dataType).toLowerCase();
  const unsigned = /unsigned/i.test(filas[0].columnType);
  const porTipo = {
    tinyint: Sequelize.TINYINT,
    smallint: Sequelize.SMALLINT,
    mediumint: Sequelize.MEDIUMINT,
    int: Sequelize.INTEGER,
    bigint: Sequelize.BIGINT
  };
  const tipo = porTipo[dataType];
  if (!tipo) throw new Error('[RF-BOD-03] pre-check: tipo no soportado para ' + tabla + '.id: ' + filas[0].columnType);
  return { tipo: unsigned ? tipo.UNSIGNED : tipo, descripcion: filas[0].columnType };
}

function timestamps(Sequelize) {
  return {
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  };
}

const OPCIONES_TABLA = { engine: 'InnoDB', charset: 'utf8mb4' };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks: usuarios debe existir y ser InnoDB (FK created_by)
    const mapaMotores = await motores(queryInterface, Sequelize, ['usuarios']);
    if (!mapaMotores.usuarios) {
      throw new Error('[RF-BOD-03] pre-check: falta la tabla usuarios. Migración abortada sin cambios.');
    }
    if (String(mapaMotores.usuarios).toLowerCase() !== 'innodb') {
      throw new Error('[RF-BOD-03] pre-check: usuarios no es InnoDB (FK no funcionan).');
    }
    const tipoUsuarioId = await tipoColumnaId(queryInterface, Sequelize, 'usuarios');
    const existentes = await motores(queryInterface, Sequelize, [T_PROVEEDORES, T_ORDENES, T_ITEMS]);

    // 2. proveedores
    if (!existentes[T_PROVEEDORES]) {
      await queryInterface.createTable(
        T_PROVEEDORES,
        Object.assign(
          {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            nombre: { type: Sequelize.STRING(150), allowNull: false },
            rut: { type: Sequelize.STRING(12), allowNull: true },
            email: { type: Sequelize.STRING(150), allowNull: true },
            telefono: { type: Sequelize.STRING(30), allowNull: true },
            contacto: { type: Sequelize.STRING(150), allowNull: true },
            activo: { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 1 }
          },
          timestamps(Sequelize)
        ),
        OPCIONES_TABLA
      );
      // UNIQUE admite varios NULL en MySQL: proveedores sin RUT permitidos
      await queryInterface.addIndex(T_PROVEEDORES, ['rut'], { name: 'uq_proveedores_rut', unique: true });
    }

    // 3. ordenes_compra
    if (!existentes[T_ORDENES]) {
      await queryInterface.createTable(
        T_ORDENES,
        Object.assign(
          {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            proveedor_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: T_PROVEEDORES, key: 'id' },
              onDelete: 'RESTRICT',
              onUpdate: 'CASCADE'
            },
            estado: { type: Sequelize.ENUM.apply(null, ESTADOS), allowNull: false, defaultValue: 'BORRADOR' },
            enviada_at: { type: Sequelize.DATE, allowNull: true },
            enviada_a_email: { type: Sequelize.STRING(150), allowNull: true },
            created_by: {
              type: tipoUsuarioId.tipo,
              allowNull: true,
              references: { model: 'usuarios', key: 'id' },
              onDelete: 'SET NULL',
              onUpdate: 'CASCADE'
            }
          },
          timestamps(Sequelize)
        ),
        OPCIONES_TABLA
      );
      await queryInterface.addIndex(T_ORDENES, ['estado'], { name: 'idx_ordenes_compra_estado' });
    }

    // 4. orden_compra_items
    if (!existentes[T_ITEMS]) {
      await queryInterface.createTable(
        T_ITEMS,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          orden_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: T_ORDENES, key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
          },
          // Sin FK: productos_bodega no existe aún (otro integrante). FK en migración posterior.
          producto_id: { type: Sequelize.INTEGER, allowNull: false },
          cantidad: { type: Sequelize.INTEGER, allowNull: false },
          cantidad_recibida: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          costo_unitario: { type: Sequelize.DECIMAL(14, 0), allowNull: true }
        },
        OPCIONES_TABLA
      );
      await queryInterface.addIndex(T_ITEMS, ['producto_id'], { name: 'idx_orden_compra_items_producto' });
    }

    console.log('[RF-BOD-03] tablas proveedores/ordenes_compra/orden_compra_items listas | usuarios.id ' +
      tipoUsuarioId.descripcion);
  },

  down: async (queryInterface, Sequelize) => {
    const tablas = [T_ITEMS, T_ORDENES, T_PROVEEDORES]; // orden inverso por FK
    const existentes = await motores(queryInterface, Sequelize, tablas);

    for (const tabla of tablas) {
      if (!existentes[tabla]) continue;
      // nombre de tabla de la constante fija, sin entrada externa
      const filas = await seleccionar(queryInterface, Sequelize, 'SELECT COUNT(*) AS n FROM `' + tabla + '`');
      const n = Number(filas[0].n);
      if (n > 0) {
        throw new Error(
          '[RF-BOD-03] down abortado: ' + tabla + ' tiene ' + n + ' filas. Los registros de bodega no se ' +
            'borran físicamente; respaldar y decidir manualmente primero.'
        );
      }
    }
    for (const tabla of tablas) {
      if (existentes[tabla]) await queryInterface.dropTable(tabla);
    }
  }
};
