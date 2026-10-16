'use strict';

/**
 * RF-CAJA-02 — Estado de pago de liquidaciones (TASK_PLAN §4 a; D-005, D-011).
 * MySQL hace autocommit del DDL: cada paso del up verifica antes de aplicar (idempotente/reanudable).
 * - Existentes -> estado_pago 'PAGADA' en el mismo ALTER; filas nuevas nacen 'EN_ESPERA'.
 * - Históricos: egreso_id NULL (hoy la liquidación no genera egreso, H1) y fecha_pago =
 *   DATE(COALESCE(centro_costos.fecha_cierre, cajas.fecha_cierre, fecha_creacion)).
 * - Sin columnas monetarias nuevas (el monto del pago vive en egresos.monto = liquido_pagar).
 * - down: aborta si hay pagos nuevos (egreso_id NOT NULL) o estados distintos de 'PAGADA'.
 */

const TABLA = 'liquidaciones';
const ESTADOS = ['EN_ESPERA', 'PAGADA', 'ANULADA'];
const FK_EGRESO = 'fk_liquidaciones_egreso_id';
const FK_PAGADA_POR = 'fk_liquidaciones_pagada_por';
const IDX_ESTADO_FECHA = 'idx_liquidaciones_estado_pago_fecha_pago';

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
  if (!filas.length) throw new Error('[RF-CAJA-02] pre-check: ' + tabla + '.id no existe');
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
  if (!tipo) throw new Error('[RF-CAJA-02] pre-check: tipo no soportado para ' + tabla + '.id: ' + filas[0].columnType);
  return { tipo: unsigned ? tipo.UNSIGNED : tipo, descripcion: filas[0].columnType };
}

async function constraintExiste(queryInterface, Sequelize, nombre) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :nombre',
    { tabla: TABLA, nombre: nombre }
  );
  return Number(filas[0].n) > 0;
}

async function indiceExiste(queryInterface, nombre) {
  const indices = await queryInterface.showIndex(TABLA);
  return indices.some(i => i.name === nombre);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks
    const requeridas = ['liquidaciones', 'egresos', 'usuarios', 'centro_costo_trabajadores', 'centro_costos', 'cajas'];
    const mapaMotores = await motores(queryInterface, Sequelize, requeridas);
    const faltantes = requeridas.filter(t => !mapaMotores[t]);
    if (faltantes.length) {
      throw new Error('[RF-CAJA-02] pre-check: faltan tablas: ' + faltantes.join(', ') + '. Migración abortada sin cambios.');
    }
    const noInnoDb = ['liquidaciones', 'egresos', 'usuarios'].filter(t => String(mapaMotores[t]).toLowerCase() !== 'innodb');
    if (noInnoDb.length) {
      throw new Error('[RF-CAJA-02] pre-check: tablas no InnoDB (transacciones/FK no funcionan): ' + noInnoDb.join(', '));
    }
    const tipoEgresoId = await tipoColumnaId(queryInterface, Sequelize, 'egresos');
    const tipoUsuarioId = await tipoColumnaId(queryInterface, Sequelize, 'usuarios');

    let columnas = await queryInterface.describeTable(TABLA);

    // 2. estado_pago: las filas existentes quedan 'PAGADA' en el mismo ALTER
    if (!columnas.estado_pago) {
      await queryInterface.addColumn(TABLA, 'estado_pago', {
        type: Sequelize.ENUM.apply(null, ESTADOS),
        allowNull: false,
        defaultValue: 'PAGADA'
      });
    }

    // 3. Filas nuevas nacen 'EN_ESPERA' (regla 2 de la spec)
    await queryInterface.changeColumn(TABLA, 'estado_pago', {
      type: Sequelize.ENUM.apply(null, ESTADOS),
      allowNull: false,
      defaultValue: 'EN_ESPERA'
    });

    // 4. Columnas del pago (tipos copiados de egresos.id / usuarios.id para las FK)
    columnas = await queryInterface.describeTable(TABLA);
    if (!columnas.fecha_pago) {
      await queryInterface.addColumn(TABLA, 'fecha_pago', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!columnas.egreso_id) {
      await queryInterface.addColumn(TABLA, 'egreso_id', { type: tipoEgresoId.tipo, allowNull: true });
    }
    if (!columnas.pagada_por) {
      await queryInterface.addColumn(TABLA, 'pagada_por', { type: tipoUsuarioId.tipo, allowNull: true });
    }

    // 5. Backfill histórico (SQL fijo, sin interpolar variables). egreso_id queda NULL (H1, D-005)
    await queryInterface.sequelize.query(
      'UPDATE liquidaciones l ' +
        'JOIN centro_costo_trabajadores cct ON cct.liquidacioneId = l.id ' +
        'JOIN centro_costos cc ON cc.id = cct.centroCostoId ' +
        'LEFT JOIN cajas c ON c.id = cc.cajaId ' +
        'SET l.fecha_pago = DATE(COALESCE(cc.fecha_cierre, c.fecha_cierre, l.fecha_creacion)) ' +
        'WHERE l.fecha_pago IS NULL'
    );
    // Huérfanas (sin centro de costo enlazado) y restantes: fecha de creación
    await queryInterface.sequelize.query(
      'UPDATE liquidaciones SET fecha_pago = DATE(fecha_creacion) WHERE fecha_pago IS NULL'
    );

    // 6. FK
    if (!(await constraintExiste(queryInterface, Sequelize, FK_EGRESO))) {
      await queryInterface.addConstraint(TABLA, ['egreso_id'], {
        type: 'foreign key',
        name: FK_EGRESO,
        references: { table: 'egresos', field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
    }
    if (!(await constraintExiste(queryInterface, Sequelize, FK_PAGADA_POR))) {
      await queryInterface.addConstraint(TABLA, ['pagada_por'], {
        type: 'foreign key',
        name: FK_PAGADA_POR,
        references: { table: 'usuarios', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    // 7. Índice para reportes (RNF-BI-01)
    if (!(await indiceExiste(queryInterface, IDX_ESTADO_FECHA))) {
      await queryInterface.addIndex(TABLA, ['estado_pago', 'fecha_pago'], { name: IDX_ESTADO_FECHA });
    }

    // 8. Conteos (sin datos personales)
    const conteo = await seleccionar(
      queryInterface,
      Sequelize,
      'SELECT COUNT(*) AS total, ' +
        'SUM(EXISTS (SELECT 1 FROM centro_costo_trabajadores cct WHERE cct.liquidacioneId = l.id)) AS con_centro, ' +
        'SUM(NOT EXISTS (SELECT 1 FROM centro_costo_trabajadores cct WHERE cct.liquidacioneId = l.id)) AS huerfanas, ' +
        'SUM(l.fecha_pago IS NULL) AS fecha_pago_null, ' +
        "SUM(l.estado_pago = 'PAGADA') AS pagadas " +
        'FROM liquidaciones l'
    );
    const huerfanas = await seleccionar(
      queryInterface,
      Sequelize,
      'SELECT l.id FROM liquidaciones l WHERE NOT EXISTS ' +
        '(SELECT 1 FROM centro_costo_trabajadores cct WHERE cct.liquidacioneId = l.id) ORDER BY l.id LIMIT 200'
    );
    const c = conteo[0];
    console.log(
      '[RF-CAJA-02] liquidaciones total=' + Number(c.total) + ' con_centro=' + Number(c.con_centro || 0) +
        ' huerfanas=' + Number(c.huerfanas || 0) + ' fecha_pago_null=' + Number(c.fecha_pago_null || 0) +
        ' pagadas=' + Number(c.pagadas || 0) + ' | egresos.id ' + tipoEgresoId.descripcion +
        ', usuarios.id ' + tipoUsuarioId.descripcion
    );
    if (huerfanas.length) {
      console.log('[RF-CAJA-02] ids huérfanas (máx. 200, documentar en Docs/migracion_caja.md): ' +
        huerfanas.map(h => h.id).join(','));
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);

    if (columnas.estado_pago || columnas.egreso_id) {
      const condiciones = [];
      if (columnas.egreso_id) condiciones.push('egreso_id IS NOT NULL');
      if (columnas.estado_pago) condiciones.push("estado_pago <> 'PAGADA'");
      const filas = await seleccionar(
        queryInterface,
        Sequelize,
        'SELECT COUNT(*) AS n FROM liquidaciones WHERE ' + condiciones.join(' OR ') // condiciones fijas, sin entrada externa
      );
      const n = Number(filas[0].n);
      if (n > 0) {
        throw new Error(
          '[RF-CAJA-02] down abortado: ' + n + ' liquidaciones con pago nuevo (egreso_id) o estado distinto de PAGADA. ' +
            'Se perderían pagos y el legacy contaría dos veces sus egresos. Respaldar y conciliar manualmente primero.'
        );
      }
    }

    if (await indiceExiste(queryInterface, IDX_ESTADO_FECHA)) {
      await queryInterface.removeIndex(TABLA, IDX_ESTADO_FECHA);
    }
    if (await constraintExiste(queryInterface, Sequelize, FK_PAGADA_POR)) {
      await queryInterface.removeConstraint(TABLA, FK_PAGADA_POR);
    }
    if (await constraintExiste(queryInterface, Sequelize, FK_EGRESO)) {
      await queryInterface.removeConstraint(TABLA, FK_EGRESO);
    }
    const actuales = await queryInterface.describeTable(TABLA);
    const quitar = ['pagada_por', 'egreso_id', 'fecha_pago', 'estado_pago'];
    for (const col of quitar) {
      if (actuales[col]) await queryInterface.removeColumn(TABLA, col);
    }
  }
};
