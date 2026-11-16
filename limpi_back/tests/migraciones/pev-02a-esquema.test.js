/**
 * RF-PEV-02a — Migración 20261116052140 (esquema aditivo de actividades/asignaciones) con
 * queryInterface simulado (sin BD), patrón tests/migraciones/publicaciones.test.js.
 * Foco: up crea las 3 tablas con el UNIQUE uq_asig_activa y las columnas puente NULL; up es
 * idempotente; down aborta si hay datos y elimina todo cuando está vacío.
 */
const migracion = require('../../migrations/20261116052140-RF-PEV-02a-esquema-asignaciones');

const TABLAS_LEGACY = ['clientes', 'areas', 'trabajadores', 'turnos', 'tareas',
  'linea_lista_pev_trabajadores', 'linea_lista_super_trabajadores'];

const Sequelize = {
  INTEGER: 'INTEGER', TINYINT: 'TINYINT', DATE: 'DATE', DATEONLY: 'DATEONLY',
  STRING: (n) => 'STRING(' + n + ')',
  QueryTypes: { SELECT: 'SELECT' }
};

/**
 * @param {object} o
 * @param {string[]} o.existentes tablas que "existen" (las nuevas se agregan según el escenario)
 * @param {number} o.filasAct filas en actividades (para down)
 * @param {number} o.filasAsig filas en actividad_asignaciones (para down)
 * @param {number} o.vinculos filas legacy con actividadId/asignacionId NOT NULL (para down)
 * @param {string[]} o.indices índices existentes (idempotencia)
 * @param {boolean} o.conPuente true si las columnas puente ya existen (idempotencia)
 */
function queryInterface(o) {
  const existentes = new Set(o.existentes || TABLAS_LEGACY);
  const constraints = new Set(o.constraints || []);
  const indices = new Set(o.indices || []);
  return {
    createTable: jest.fn(async () => {}),
    dropTable: jest.fn(async () => {}),
    addIndex: jest.fn(async () => {}),
    addConstraint: jest.fn(async () => {}),
    removeConstraint: jest.fn(async () => {}),
    removeIndex: jest.fn(async () => {}),
    addColumn: jest.fn(async () => {}),
    removeColumn: jest.fn(async () => {}),
    showIndex: jest.fn(async () => Array.from(indices).map((name) => ({ name: name }))),
    describeTable: jest.fn(async (tabla) => {
      if (TABLAS_LEGACY.indexOf(tabla) === -1) return {};
      const cols = {};
      if (o.conPuente) {
        if (tabla === 'tareas') cols.actividadId = {};
        if (tabla !== 'tareas' && tabla.indexOf('linea_') === 0) cols.asignacionId = {};
      }
      return cols;
    }),
    sequelize: {
      transaction: jest.fn(async (fn) => fn({})),
      query: jest.fn(async (sql, opts) => {
        const rep = (opts && opts.replacements) || {};
        if (/@@SESSION/.test(sql)) return [{ fkc: 1, lwt: 50 }];
        if (/^(SET SESSION|ALTER TABLE)/.test(sql)) return [];
        if (/information_schema\.TABLES/.test(sql)) {
          return rep.tablas.filter((t) => existentes.has(t)).map((t) => ({ tabla: t, motor: 'InnoDB' }));
        }
        if (/information_schema\.COLUMNS/.test(sql)) {
          return [{ dataType: 'int', columnType: 'int(11)' }];
        }
        if (/information_schema\.TABLE_CONSTRAINTS/.test(sql)) {
          return [{ n: constraints.has(rep.tabla + '.' + rep.nombre) ? 1 : 0 }];
        }
        if (/FROM actividad_asignaciones/.test(sql)) return [{ n: o.filasAsig || 0 }];
        if (/FROM actividades/.test(sql)) return [{ n: o.filasAct || 0 }];
        if (/IS NOT NULL/.test(sql)) return [{ n: o.vinculos || 0 }];
        throw new Error('SQL no esperado en el mock: ' + sql);
      })
    }
  };
}

describe('up', () => {
  it('crea las 3 tablas nuevas, el UNIQUE uq_asig_activa y las columnas puente NULL en legacy', async () => {
    const qi = queryInterface({});
    await migracion.up(qi, Sequelize);

    const tablas = qi.createTable.mock.calls.map((c) => c[0]);
    expect(tablas).toEqual(['actividades', 'actividad_pasos', 'actividad_asignaciones']);

    const asig = qi.createTable.mock.calls.filter((c) => c[0] === 'actividad_asignaciones')[0][1];
    expect(asig.activa_flag).toEqual({ type: 'TINYINT', allowNull: true }); // sin DEFAULT (D-101)
    expect(asig.estado).toEqual({ type: 'STRING(10)', allowNull: false }); // sin DEFAULT: lo fija el servicio
    expect(asig.turno_id.allowNull).toBe(true); // NULL solo para backfill (D-106)
    expect(asig.fecha_hasta.allowNull).toBe(true);
    expect(asig.cerrada_at.allowNull).toBe(true);

    const pasos = qi.createTable.mock.calls.filter((c) => c[0] === 'actividad_pasos')[0][1];
    expect(pasos.created_at).toBeUndefined(); // actividad_pasos sin timestamps

    // UNIQUE parcial simulado: una sola ACTIVA por (actividad, área, trabajador, turno).
    expect(qi.addIndex).toHaveBeenCalledWith(
      'actividad_asignaciones',
      ['actividad_id', 'area_id', 'trabajador_id', 'turno_id', 'activa_flag'],
      { name: 'uq_asig_activa', unique: true }
    );
    expect(qi.addIndex).toHaveBeenCalledWith('actividades', ['cliente_id', 'nombre'],
      { name: 'uq_actividades_cliente_nombre', unique: true });

    // Columnas puente NULL en tablas legacy (sin backfill): un ALTER INPLACE por tabla con FK checks off.
    const sqls = qi.sequelize.query.mock.calls.map((c) => c[0]);
    const alters = sqls.filter((s) => /^ALTER TABLE/.test(s));
    expect(alters.length).toBe(3);
    [['tareas', 'actividadId'], ['linea_lista_pev_trabajadores', 'asignacionId'],
      ['linea_lista_super_trabajadores', 'asignacionId']].forEach(([tabla, col]) => {
      const alter = alters.find((s) => s.indexOf('ALTER TABLE `' + tabla + '`') === 0);
      expect(alter).toContain('ADD COLUMN `' + col + '` INT NULL');
      expect(alter).toContain('FOREIGN KEY (`' + col + '`)');
      expect(alter).toMatch(/ALGORITHM=INPLACE, LOCK=NONE$/);
    });
    expect(sqls).toContain('SET SESSION foreign_key_checks = 0');
    expect(sqls).toContain('SET SESSION foreign_key_checks = 1'); // restaura el valor previo
    expect(qi.addColumn).not.toHaveBeenCalled();

    // FKs con RESTRICT/CASCADE (D-107).
    const fk = qi.addConstraint.mock.calls.filter((c) => c[0] === 'actividad_asignaciones');
    expect(fk.length).toBe(5); // actividad, área, trabajador, turno, tarea
    expect(fk[0][2]).toMatchObject({ type: 'foreign key', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  });

  it('es idempotente: con todo ya creado no repite createTable/addColumn/addIndex/addConstraint', async () => {
    const qi = queryInterface({
      existentes: TABLAS_LEGACY.concat(['actividades', 'actividad_pasos', 'actividad_asignaciones']),
      conPuente: true,
      indices: ['uq_actividades_cliente_nombre', 'uq_actividad_pasos_orden', 'uq_asig_activa',
        'idx_asig_trabajador', 'idx_asig_area', 'idx_asig_fechas', 'idx_asig_turno', 'idx_asig_tarea',
        'idx_tareas_actividadId', 'idx_llpt_asignacionId', 'idx_llst_asignacionId'],
      constraints: [
        'actividades.fk_actividades_cliente_id', 'actividad_pasos.fk_actividad_pasos_actividad_id',
        'actividad_asignaciones.fk_asig_actividad_id', 'actividad_asignaciones.fk_asig_area_id',
        'actividad_asignaciones.fk_asig_trabajador_id', 'actividad_asignaciones.fk_asig_turno_id',
        'actividad_asignaciones.fk_asig_tarea_id', 'tareas.fk_tareas_actividadId',
        'linea_lista_pev_trabajadores.fk_llpt_asignacionId', 'linea_lista_super_trabajadores.fk_llst_asignacionId'
      ]
    });
    await migracion.up(qi, Sequelize);
    expect(qi.createTable).not.toHaveBeenCalled();
    expect(qi.addColumn).not.toHaveBeenCalled();
    expect(qi.addIndex).not.toHaveBeenCalled();
    expect(qi.addConstraint).not.toHaveBeenCalled();
  });

  it('aborta sin cambios si falta una tabla referenciada (pre-check A0)', async () => {
    const qi = queryInterface({ existentes: TABLAS_LEGACY.filter((t) => t !== 'turnos') });
    await expect(migracion.up(qi, Sequelize)).rejects.toThrow(/faltan tablas: turnos/);
    expect(qi.createTable).not.toHaveBeenCalled();
  });
});

describe('down', () => {
  it('aborta si hay filas en las tablas nuevas o vínculos NOT NULL (guardia anti-pérdida)', async () => {
    const qi = queryInterface({
      existentes: TABLAS_LEGACY.concat(['actividades', 'actividad_asignaciones']),
      conPuente: true, filasAsig: 2, filasAct: 1, vinculos: 0
    });
    await expect(migracion.down(qi, Sequelize)).rejects.toThrow(/down abortado/);
    expect(qi.dropTable).not.toHaveBeenCalled();
    expect(qi.removeColumn).not.toHaveBeenCalled();

    const qiVinculos = queryInterface({
      existentes: TABLAS_LEGACY, conPuente: true, filasAct: 0, filasAsig: 0, vinculos: 3
    });
    await expect(migracion.down(qiVinculos, Sequelize)).rejects.toThrow(/down abortado/);
    expect(qiVinculos.removeColumn).not.toHaveBeenCalled();
  });

  it('vacío: quita columnas puente (FK -> índice -> columna) y elimina las 3 tablas de hijas a padre', async () => {
    const qi = queryInterface({
      existentes: TABLAS_LEGACY.concat(['actividades', 'actividad_pasos', 'actividad_asignaciones']),
      conPuente: true, filasAct: 0, filasAsig: 0, vinculos: 0,
      indices: ['idx_tareas_actividadId', 'idx_llpt_asignacionId', 'idx_llst_asignacionId'],
      constraints: ['tareas.fk_tareas_actividadId', 'linea_lista_pev_trabajadores.fk_llpt_asignacionId',
        'linea_lista_super_trabajadores.fk_llst_asignacionId']
    });
    await migracion.down(qi, Sequelize);
    expect(qi.dropTable.mock.calls.map((c) => c[0])).toEqual(['actividad_asignaciones', 'actividad_pasos', 'actividades']);
    expect(qi.removeColumn).toHaveBeenCalledWith('tareas', 'actividadId');
    expect(qi.removeColumn).toHaveBeenCalledWith('linea_lista_pev_trabajadores', 'asignacionId');
    expect(qi.removeConstraint).toHaveBeenCalledWith('tareas', 'fk_tareas_actividadId');
    expect(qi.removeIndex).toHaveBeenCalledWith('tareas', 'idx_tareas_actividadId');
  });
});
