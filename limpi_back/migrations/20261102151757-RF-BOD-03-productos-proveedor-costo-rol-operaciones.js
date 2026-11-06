'use strict';

/**
 * RF-BOD-03 — Producto ↔ proveedor, costo unitario, FK de items de OC y rol Operaciones.
 * "productos_bodega" de la spec = tabla real `productos` (ya referenciada por solicitud_items).
 * MySQL hace autocommit del DDL: cada paso verifica antes de aplicar (idempotente/reanudable).
 * - productos.proveedor_id / costo_unitario nacen NULL: el comportamiento histórico no cambia.
 * - orden_compra_items.producto_id -> productos.id solo si no hay huérfanos y los tipos coinciden.
 * - roles: fila 'Operaciones' (Subjefe de Operaciones) solo si no existe.
 * - down: aborta si productos ya tiene proveedor/costo cargados; el rol no se borra si está asignado.
 */

const FK_PROD_PROV = 'fk_productos_proveedor';
const IDX_PROD_PROV = 'idx_productos_proveedor';
const FK_ITEM_PROD = 'fk_orden_compra_items_producto';
const ROL = { nombre: 'Operaciones', descripcion: 'Subjefe de Operaciones (RF-BOD-03)', estado: 1 };

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
  filas.forEach(f => { mapa[f.tabla] = String(f.motor).toLowerCase(); });
  return mapa;
}

async function tipoColumna(queryInterface, Sequelize, tabla, columna) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = :columna',
    { tabla: tabla, columna: columna }
  );
  // int(11) y int son el mismo tipo (MySQL 8 omite el display width)
  return filas.length ? String(filas[0].columnType).toLowerCase().replace(/\(\d+\)/, '') : null;
}

async function existeConstraint(queryInterface, Sequelize, tabla, nombre) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :nombre',
    { tabla: tabla, nombre: nombre }
  );
  return Number(filas[0].n) > 0;
}

async function existeIndice(queryInterface, Sequelize, tabla, nombre) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.STATISTICS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND INDEX_NAME = :nombre',
    { tabla: tabla, nombre: nombre }
  );
  return Number(filas[0].n) > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks: productos y proveedores existen, InnoDB, ids del mismo tipo
    const m = await motores(queryInterface, Sequelize, ['productos', 'proveedores', 'orden_compra_items', 'roles']);
    ['productos', 'proveedores', 'roles'].forEach(t => {
      if (!m[t]) throw new Error('[RF-BOD-03] pre-check: falta la tabla ' + t + '. Migración abortada sin cambios.');
    });
    if (m.productos !== 'innodb' || m.proveedores !== 'innodb') {
      throw new Error('[RF-BOD-03] pre-check: productos/proveedores no son InnoDB (FK no funcionan).');
    }
    const tipoProductoId = await tipoColumna(queryInterface, Sequelize, 'productos', 'id');
    const tipoProveedorId = await tipoColumna(queryInterface, Sequelize, 'proveedores', 'id');
    if (tipoProveedorId !== 'int') {
      throw new Error('[RF-BOD-03] pre-check: proveedores.id es ' + tipoProveedorId + ', se esperaba int.');
    }

    // 2. productos.proveedor_id + índice + FK (SET NULL: borrar proveedor no toca el producto)
    if (!(await tipoColumna(queryInterface, Sequelize, 'productos', 'proveedor_id'))) {
      await queryInterface.addColumn('productos', 'proveedor_id', { type: Sequelize.INTEGER, allowNull: true });
    }
    if (!(await existeIndice(queryInterface, Sequelize, 'productos', IDX_PROD_PROV))) {
      await queryInterface.addIndex('productos', ['proveedor_id'], { name: IDX_PROD_PROV });
    }
    if (!(await existeConstraint(queryInterface, Sequelize, 'productos', FK_PROD_PROV))) {
      await queryInterface.addConstraint('productos', ['proveedor_id'], {
        type: 'foreign key',
        name: FK_PROD_PROV,
        references: { table: 'proveedores', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    // 3. productos.costo_unitario (CLP entero)
    if (!(await tipoColumna(queryInterface, Sequelize, 'productos', 'costo_unitario'))) {
      await queryInterface.addColumn('productos', 'costo_unitario', { type: Sequelize.DECIMAL(14, 0), allowNull: true });
    }

    // 4. FK orden_compra_items.producto_id -> productos.id (solo si es seguro)
    let estadoFkItems = 'omitida: no existe orden_compra_items';
    if (m.orden_compra_items) {
      if (await existeConstraint(queryInterface, Sequelize, 'orden_compra_items', FK_ITEM_PROD)) {
        estadoFkItems = 'ya existía';
      } else {
        const tipoItem = await tipoColumna(queryInterface, Sequelize, 'orden_compra_items', 'producto_id');
        const huerfanos = Number((await seleccionar(
          queryInterface,
          Sequelize,
          'SELECT COUNT(*) AS n FROM orden_compra_items i LEFT JOIN productos p ON p.id = i.producto_id WHERE p.id IS NULL'
        ))[0].n);
        if (m.orden_compra_items !== 'innodb' || tipoItem !== tipoProductoId) {
          estadoFkItems = 'OMITIDA: tipos/motor no coinciden (' + tipoItem + ' vs ' + tipoProductoId + ')';
        } else if (huerfanos > 0) {
          estadoFkItems = 'OMITIDA: ' + huerfanos + ' items huérfanos; corregir y crear la FK en otra migración';
        } else {
          await queryInterface.addConstraint('orden_compra_items', ['producto_id'], {
            type: 'foreign key',
            name: FK_ITEM_PROD,
            references: { table: 'productos', field: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE'
          });
          estadoFkItems = 'creada';
        }
      }
    }

    // 5. Rol Operaciones
    const rol = await seleccionar(queryInterface, Sequelize, 'SELECT id FROM roles WHERE nombre = :nombre', { nombre: ROL.nombre });
    if (!rol.length) {
      await queryInterface.sequelize.query(
        'INSERT INTO roles (nombre, descripcion, estado) VALUES (:nombre, :descripcion, :estado)',
        { replacements: ROL }
      );
    }

    console.log('[RF-BOD-03] productos.proveedor_id/costo_unitario listos | FK items->productos: ' + estadoFkItems +
      ' | rol Operaciones ' + (rol.length ? 'ya existía' : 'creado'));
  },

  down: async (queryInterface, Sequelize) => {
    // Pre-check antes de cualquier DDL (autocommit): no perder datos cargados
    const tieneProv = await tipoColumna(queryInterface, Sequelize, 'productos', 'proveedor_id');
    const tieneCosto = await tipoColumna(queryInterface, Sequelize, 'productos', 'costo_unitario');
    const condiciones = [];
    if (tieneProv) condiciones.push('proveedor_id IS NOT NULL');
    if (tieneCosto) condiciones.push('costo_unitario IS NOT NULL');
    if (condiciones.length) {
      // condiciones fijas del código, sin entrada externa
      const n = Number((await seleccionar(
        queryInterface,
        Sequelize,
        'SELECT COUNT(*) AS n FROM productos WHERE ' + condiciones.join(' OR ')
      ))[0].n);
      if (n > 0) {
        throw new Error('[RF-BOD-03] down abortado: ' + n + ' productos tienen proveedor_id o costo_unitario. ' +
          'Respaldar y limpiar manualmente primero. Sin cambios.');
      }
    }

    // Rol: solo borra la fila creada por esta migración (mismo nombre Y descripcion exacta) y sin usuarios asignados.
    const rol = await seleccionar(
      queryInterface,
      Sequelize,
      'SELECT id FROM roles WHERE nombre = :nombre AND descripcion = :descripcion',
      { nombre: ROL.nombre, descripcion: ROL.descripcion }
    );
    if (rol.length) {
      const ids = rol.map(r => r.id);
      const asignados = Number((await seleccionar(
        queryInterface,
        Sequelize,
        'SELECT COUNT(*) AS n FROM usuarios WHERE roleId IN (:ids)',
        { ids: ids }
      ))[0].n);
      if (asignados > 0) {
        console.warn('[RF-BOD-03] rol Operaciones NO borrado: ' + asignados + ' usuarios lo tienen asignado.');
      } else {
        await queryInterface.sequelize.query('DELETE FROM roles WHERE id IN (:ids)', { replacements: { ids: ids } });
      }
    }

    if (await existeConstraint(queryInterface, Sequelize, 'orden_compra_items', FK_ITEM_PROD)) {
      await queryInterface.removeConstraint('orden_compra_items', FK_ITEM_PROD);
    }
    if (await existeConstraint(queryInterface, Sequelize, 'productos', FK_PROD_PROV)) {
      await queryInterface.removeConstraint('productos', FK_PROD_PROV);
    }
    if (await existeIndice(queryInterface, Sequelize, 'productos', IDX_PROD_PROV)) {
      await queryInterface.removeIndex('productos', IDX_PROD_PROV);
    }
    if (tieneCosto) await queryInterface.removeColumn('productos', 'costo_unitario');
    if (tieneProv) await queryInterface.removeColumn('productos', 'proveedor_id');
  }
};
