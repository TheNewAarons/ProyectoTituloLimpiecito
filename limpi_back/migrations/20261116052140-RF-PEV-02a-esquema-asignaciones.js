'use strict';

/**
 * RF-PEV-02a — Esquema aditivo de actividades y asignaciones (TASK_PLAN "RF-PEV-02 — Diseño final" §1.1; D-101…D-108).
 * - Tablas nuevas: actividades, actividad_pasos, actividad_asignaciones.
 * - Columnas nuevas NULL (filas existentes intactas, sin backfill): tareas.actividadId,
 *   linea_lista_pev_trabajadores.asignacionId, linea_lista_super_trabajadores.asignacionId.
 * - activa_flag es TINYINT NULL normal, NO generada (D-101): la fija el servicio (1 si ACTIVA, si no NULL).
 *   UNIQUE(actividad_id, area_id, trabajador_id, turno_id, activa_flag): MySQL admite varios NULL.
 * - FK ON DELETE RESTRICT / ON UPDATE CASCADE (D-107); tipos copiados de los id referenciados.
 * - MySQL hace autocommit del DDL (no hay transacción posible): cada paso verifica antes de aplicar
 *   (idempotente/reanudable, patrón RF-CAJA-02).
 * - down: aborta si hay filas en las tablas nuevas o vínculos actividadId/asignacionId NOT NULL.
 */

const T_ACT = 'actividades';
const T_PASOS = 'actividad_pasos';
const T_ASIG = 'actividad_asignaciones';
const OPCIONES_TABLA = { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };
const REGLA_FK = { onDelete: 'RESTRICT', onUpdate: 'CASCADE' };

// Columnas puente en tablas legacy (orden de down: inverso)
const COLUMNAS_LEGACY = [
  { tabla: 'tareas', columna: 'actividadId', ref: T_ACT, idx: 'idx_tareas_actividadId', fk: 'fk_tareas_actividadId' },
  { tabla: 'linea_lista_pev_trabajadores', columna: 'asignacionId', ref: T_ASIG, idx: 'idx_llpt_asignacionId', fk: 'fk_llpt_asignacionId' },
  { tabla: 'linea_lista_super_trabajadores', columna: 'asignacionId', ref: T_ASIG, idx: 'idx_llst_asignacionId', fk: 'fk_llst_asignacionId' }
];

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
  if (!filas.length) throw new Error('[RF-PEV-02a] pre-check: ' + tabla + '.id no existe');
  const porTipo = {
    smallint: Sequelize.SMALLINT,
    mediumint: Sequelize.MEDIUMINT,
    int: Sequelize.INTEGER,
    bigint: Sequelize.BIGINT
  };
  const tipo = porTipo[String(filas[0].dataType).toLowerCase()];
  if (!tipo) throw new Error('[RF-PEV-02a] pre-check: tipo no soportado para ' + tabla + '.id: ' + filas[0].columnType);
  return /unsigned/i.test(filas[0].columnType) ? tipo.UNSIGNED : tipo;
}

async function existeTabla(queryInterface, Sequelize, tabla) {
  const m = await motores(queryInterface, Sequelize, [tabla]);
  return Boolean(m[tabla]);
}

async function constraintExiste(queryInterface, Sequelize, tabla, nombre) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :nombre',
    { tabla: tabla, nombre: nombre }
  );
  return Number(filas[0].n) > 0;
}

async function indiceExiste(queryInterface, tabla, nombre) {
  const indices = await queryInterface.showIndex(tabla);
  return indices.some(i => i.name === nombre);
}

async function asegurarIndice(queryInterface, tabla, campos, nombre, unico) {
  if (!(await indiceExiste(queryInterface, tabla, nombre))) {
    await queryInterface.addIndex(tabla, campos, { name: nombre, unique: Boolean(unico) });
  }
}

async function asegurarFk(queryInterface, Sequelize, tabla, campo, refTabla, nombre) {
  if (!(await constraintExiste(queryInterface, Sequelize, tabla, nombre))) {
    await queryInterface.addConstraint(tabla, [campo], Object.assign({
      type: 'foreign key',
      name: nombre,
      references: { table: refTabla, field: 'id' }
    }, REGLA_FK));
  }
}

function idPk(Sequelize) {
  return { type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true };
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks (A0): tablas referenciadas existen y son InnoDB
    const requeridas = ['clientes', 'areas', 'trabajadores', 'turnos', 'tareas',
      'linea_lista_pev_trabajadores', 'linea_lista_super_trabajadores'];
    const mapa = await motores(queryInterface, Sequelize, requeridas);
    const faltantes = requeridas.filter(t => !mapa[t]);
    if (faltantes.length) {
      throw new Error('[RF-PEV-02a] pre-check: faltan tablas: ' + faltantes.join(', ') + '. Migración abortada sin cambios.');
    }
    const noInnoDb = requeridas.filter(t => String(mapa[t]).toLowerCase() !== 'innodb');
    if (noInnoDb.length) {
      throw new Error('[RF-PEV-02a] pre-check: tablas no InnoDB (FK no funcionan): ' + noInnoDb.join(', '));
    }
    const tipo = {};
    for (const t of ['clientes', 'areas', 'trabajadores', 'turnos', 'tareas']) {
      tipo[t] = await tipoColumnaId(queryInterface, Sequelize, t);
    }

    // 2. actividades
    if (!(await existeTabla(queryInterface, Sequelize, T_ACT))) {
      await queryInterface.createTable(T_ACT, {
        id: idPk(Sequelize),
        cliente_id: { type: tipo.clientes, allowNull: false },
        nombre: { type: Sequelize.STRING(100), allowNull: false },
        estado: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        origen: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'APP' },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      }, OPCIONES_TABLA);
    }
    await asegurarIndice(queryInterface, T_ACT, ['cliente_id', 'nombre'], 'uq_actividades_cliente_nombre', true);
    await asegurarFk(queryInterface, Sequelize, T_ACT, 'cliente_id', 'clientes', 'fk_actividades_cliente_id');

    // 3. actividad_pasos (sin timestamps)
    if (!(await existeTabla(queryInterface, Sequelize, T_PASOS))) {
      await queryInterface.createTable(T_PASOS, {
        id: idPk(Sequelize),
        actividad_id: { type: Sequelize.INTEGER, allowNull: false },
        orden: { type: Sequelize.TINYINT, allowNull: false },
        nombre: { type: Sequelize.STRING(100), allowNull: false },
        columna_legacy: { type: Sequelize.STRING(30), allowNull: true },
        estado: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }
      }, OPCIONES_TABLA);
    }
    await asegurarIndice(queryInterface, T_PASOS, ['actividad_id', 'orden'], 'uq_actividad_pasos_orden', true);
    await asegurarFk(queryInterface, Sequelize, T_PASOS, 'actividad_id', T_ACT, 'fk_actividad_pasos_actividad_id');

    // 4. actividad_asignaciones (estado y activa_flag sin DEFAULT: el servicio los fija, D-101)
    if (!(await existeTabla(queryInterface, Sequelize, T_ASIG))) {
      await queryInterface.createTable(T_ASIG, {
        id: idPk(Sequelize),
        actividad_id: { type: Sequelize.INTEGER, allowNull: false },
        area_id: { type: tipo.areas, allowNull: false },
        trabajador_id: { type: tipo.trabajadores, allowNull: false },
        tarea_id: { type: tipo.tareas, allowNull: false },
        turno_id: { type: tipo.turnos, allowNull: true }, // NULL solo para backfill sin turno (D-106)
        fecha_desde: { type: Sequelize.DATEONLY, allowNull: false },
        fecha_hasta: { type: Sequelize.DATEONLY, allowNull: true },
        estado: { type: Sequelize.STRING(10), allowNull: false },
        activa_flag: { type: Sequelize.TINYINT, allowNull: true },
        origen: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'APP' },
        motivo: { type: Sequelize.STRING(500), allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        cerrada_by: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
        cerrada_at: { type: Sequelize.DATE, allowNull: true }
      }, OPCIONES_TABLA);
    }
    // Índices antes de las FK, para que InnoDB no cree índices implícitos con otro nombre
    await asegurarIndice(queryInterface, T_ASIG,
      ['actividad_id', 'area_id', 'trabajador_id', 'turno_id', 'activa_flag'], 'uq_asig_activa', true);
    await asegurarIndice(queryInterface, T_ASIG, ['trabajador_id', 'estado', 'fecha_desde'], 'idx_asig_trabajador');
    await asegurarIndice(queryInterface, T_ASIG, ['area_id', 'estado'], 'idx_asig_area');
    await asegurarIndice(queryInterface, T_ASIG, ['fecha_desde', 'fecha_hasta'], 'idx_asig_fechas');
    await asegurarIndice(queryInterface, T_ASIG, ['turno_id'], 'idx_asig_turno');
    await asegurarIndice(queryInterface, T_ASIG, ['tarea_id'], 'idx_asig_tarea');
    await asegurarFk(queryInterface, Sequelize, T_ASIG, 'actividad_id', T_ACT, 'fk_asig_actividad_id');
    await asegurarFk(queryInterface, Sequelize, T_ASIG, 'area_id', 'areas', 'fk_asig_area_id');
    await asegurarFk(queryInterface, Sequelize, T_ASIG, 'trabajador_id', 'trabajadores', 'fk_asig_trabajador_id');
    await asegurarFk(queryInterface, Sequelize, T_ASIG, 'turno_id', 'turnos', 'fk_asig_turno_id');
    await asegurarFk(queryInterface, Sequelize, T_ASIG, 'tarea_id', 'tareas', 'fk_asig_tarea_id');

    // 5. Columnas puente NULL en tablas legacy (sin UPDATE: comportamiento histórico intacto)
    for (const c of COLUMNAS_LEGACY) {
      const columnas = await queryInterface.describeTable(c.tabla);
      if (!columnas[c.columna]) {
        await queryInterface.addColumn(c.tabla, c.columna, { type: Sequelize.INTEGER, allowNull: true });
      }
      await asegurarIndice(queryInterface, c.tabla, [c.columna], c.idx);
      await asegurarFk(queryInterface, Sequelize, c.tabla, c.columna, c.ref, c.fk);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Guardia: no perder actividades/asignaciones ni vínculos (exportar antes, con autorización, d.7)
    const chequeos = [];
    for (const t of [T_ACT, T_ASIG]) {
      if (await existeTabla(queryInterface, Sequelize, t)) chequeos.push({ etiqueta: t, sql: 'SELECT COUNT(*) AS n FROM ' + t });
    }
    for (const c of COLUMNAS_LEGACY) {
      const columnas = await queryInterface.describeTable(c.tabla);
      if (columnas[c.columna]) {
        chequeos.push({
          etiqueta: c.tabla + '.' + c.columna,
          sql: 'SELECT COUNT(*) AS n FROM ' + c.tabla + ' WHERE ' + c.columna + ' IS NOT NULL' // identificadores fijos
        });
      }
    }
    const bloqueos = [];
    for (const ch of chequeos) {
      const n = Number((await seleccionar(queryInterface, Sequelize, ch.sql))[0].n);
      if (n > 0) bloqueos.push(ch.etiqueta + '=' + n);
    }
    if (bloqueos.length) {
      throw new Error('[RF-PEV-02a] down abortado: hay datos que se perderían (' + bloqueos.join(', ') + '). ' +
        'Exportar y limpiar con autorización antes de revertir.');
    }

    // 2. Columnas puente: FK -> índice -> columna
    for (const c of COLUMNAS_LEGACY.slice().reverse()) {
      if (await constraintExiste(queryInterface, Sequelize, c.tabla, c.fk)) {
        await queryInterface.removeConstraint(c.tabla, c.fk);
      }
      if (await indiceExiste(queryInterface, c.tabla, c.idx)) {
        await queryInterface.removeIndex(c.tabla, c.idx);
      }
      const columnas = await queryInterface.describeTable(c.tabla);
      if (columnas[c.columna]) await queryInterface.removeColumn(c.tabla, c.columna);
    }

    // 3. Tablas nuevas (vacías por la guardia), de hijas a padre
    for (const t of [T_ASIG, T_PASOS, T_ACT]) {
      if (await existeTabla(queryInterface, Sequelize, t)) await queryInterface.dropTable(t);
    }
  }
};
