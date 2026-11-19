'use strict';

/**
 * Utilidad de test (RF-PEV-02b): instancia Sequelize falsa para services/pev/backfill.js.
 * Despacha por patrón de SQL y devuelve fixtures; registra todas las consultas en `calls`
 * para aserciones sobre lo escrito. No toca BD.
 *
 * @param {object} fx fixtures: tareas, actividades, trabajadores, existentes, lineasPev, lineasSup
 * @param {object} [opts] logExiste, maxLote, filasLog, updateCount, deleteCount,
 *   guardias ({fragmentoSql: n}), dropTable (jest.fn)
 */
function falsoSequelize(fx, opts) {
  opts = opts || {};
  fx = fx || {};
  const calls = [];
  let insAct = 900;
  let insPaso = 800;
  let insAsig = 700;
  const query = jest.fn(async (sql, o) => {
    calls.push(sql);
    const rep = (o && o.replacements) || {};
    if (/CREATE TABLE/.test(sql)) return [];
    if (/@@SESSION/.test(sql)) return [{ lwt: 50, ilwt: 50 }];
    if (/^SET SESSION/.test(sql)) return [];
    if (/information_schema\.TABLES/.test(sql)) return [{ n: opts.logExiste ? 1 : 0 }];
    if (/ORDER BY id FOR UPDATE/.test(sql)) return [];
    if (/COALESCE\(MAX\(lote\), 0\) \+ 1/.test(sql)) return [{ n: (opts.maxLote || 0) + 1 }];
    if (/COALESCE\(MAX\(lote\), 0\) AS n/.test(sql)) return [{ n: opts.maxLote || 0 }];
    if (/^INSERT INTO actividades /.test(sql)) return [++insAct];
    if (/^INSERT INTO actividad_pasos /.test(sql)) return [++insPaso];
    if (/^INSERT INTO actividad_asignaciones /.test(sql)) return [++insAsig];
    if (/^INSERT INTO `pev_backfill_log`/.test(sql)) return [1];
    if (/^INSERT INTO auditoria /.test(sql)) return [1];
    if (/^UPDATE `/.test(sql)) return [null, rep.ids ? rep.ids.length : opts.updateCount || 0];
    if (/^DELETE x FROM/.test(sql)) return opts.deleteCount || 0;
    if (/^DELETE FROM `pev_backfill_log`/.test(sql)) return 0;
    if (/SELECT COUNT\(\*\) AS n FROM `pev_backfill_log`/.test(sql)) return [{ n: opts.filasLog || 0 }];
    // Guardias del down: COUNT(*) ... JOIN `pev_backfill_log` (después de los patrones de lectura)
    if (/COUNT\(\*\) AS n/.test(sql) && /JOIN `pev_backfill_log`/.test(sql)) {
      const guardias = opts.guardias || {};
      const claves = Object.keys(guardias);
      for (let i = 0; i < claves.length; i++) {
        if (sql.indexOf(claves[i]) !== -1) return [{ n: guardias[claves[i]] }];
      }
      return [{ n: 0 }];
    }
    // Lecturas de planificar (al final: las guardias también mencionan estas tablas con alias x)
    if (/FROM tareas t LEFT JOIN areas/.test(sql)) return fx.tareas || [];
    if (/FROM actividades ORDER BY/.test(sql)) return fx.actividades || [];
    if (/FROM trabajadores WHERE/.test(sql)) return fx.trabajadores || [];
    if (/FROM actividad_asignaciones WHERE/.test(sql)) return fx.existentes || [];
    if (/FROM linea_lista_pev_trabajadores l /.test(sql)) return fx.lineasPev || [];
    if (/FROM linea_lista_super_trabajadores ls /.test(sql)) return fx.lineasSup || [];
    throw new Error('SQL no esperado en el mock: ' + sql);
  });
  return {
    query: query,
    calls: calls,
    transaction: jest.fn(async (o, fn) => fn({})),
    getQueryInterface: function () { return { dropTable: opts.dropTable || jest.fn(async () => {}) }; }
  };
}

/** Fixtures representativas (§2.1/§2.2): 2 clientes, homónimas por área, sufijo ' 1',
 *  nombre >100, sin cliente, n_empleado ambiguo, fecha NULL, tareaId NULL, APP preexistente. */
function fixturesBase() {
  return {
    tareas: [
      { id: 1, nombre: 'Barrer', estado: 1, areaId: 10, actividadId: null, sectoreId: 100, clienteId: 1, clave: 'barrer' },
      { id: 2, nombre: 'Barrer', estado: 0, areaId: 11, actividadId: null, sectoreId: 100, clienteId: 1, clave: 'barrer' },
      { id: 3, nombre: 'Barrer 1', estado: 1, areaId: 10, actividadId: null, sectoreId: 100, clienteId: 1, clave: 'barrer 1' },
      { id: 4, nombre: 'Trapear', estado: 1, areaId: 20, actividadId: null, sectoreId: 200, clienteId: 2, clave: 'trapear' },
      { id: 5, nombre: 'Huerfana', estado: 1, areaId: null, actividadId: null, sectoreId: null, clienteId: null, clave: 'huerfana' },
      { id: 6, nombre: 'X'.repeat(101), estado: 1, areaId: 10, actividadId: null, sectoreId: 100, clienteId: 1, clave: 'x101' },
      { id: 7, nombre: 'Trapear', estado: 1, areaId: 10, actividadId: 500, sectoreId: 100, clienteId: 1, clave: 'trapear' }
    ],
    actividades: [
      { id: 500, cliente_id: 1, origen: 'APP', clave: 'trapear' },
      { id: 501, cliente_id: 2, origen: 'APP', clave: 'trapear' }
    ],
    trabajadores: [
      { id: 11, n_empleado: 120, estado: 1 },
      { id: 12, n_empleado: 121, estado: 1 },
      { id: 13, n_empleado: 121, estado: 1 }, // n_empleado ambiguo
      { id: 14, n_empleado: 122, estado: 1 }
    ],
    existentes: [
      { id: 700, actividad_id: 500, area_id: 10, trabajador_id: 11, turno_id: 5, origen: 'APP', estado: 'ACTIVA', desde: '2026-01-01', hasta: null },
      { id: 800, actividad_id: 501, area_id: 20, trabajador_id: 14, turno_id: 6, origen: 'APP', estado: 'CERRADA', desde: '2026-01-01', hasta: '2026-01-31' }
    ],
    lineasPev: [
      { id: 1001, tareaId: 1, asignacionId: null, listaId: 101, listaTrabId: null, lpId: 101, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1002, tareaId: 2, asignacionId: null, listaId: 101, listaTrabId: null, lpId: 101, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1003, tareaId: null, asignacionId: null, listaId: 101, listaTrabId: null, lpId: 101, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1004, tareaId: 1, asignacionId: null, listaId: null, listaTrabId: null, lpId: null, n_empleado: null, sectoreId: null, fechaUtc: null, hora: null, cronId: null, cronCliente: null, turnoId: null, cronEstado: null, turnoCliente: null },
      { id: 1005, tareaId: 1, asignacionId: null, listaId: 103, listaTrabId: null, lpId: 103, n_empleado: 122, sectoreId: 100, fechaUtc: null, hora: null, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1006, tareaId: 1, asignacionId: null, listaId: 104, listaTrabId: null, lpId: 104, n_empleado: 999, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1007, tareaId: 1, asignacionId: null, listaId: 102, listaTrabId: null, lpId: 102, n_empleado: 121, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1008, tareaId: 1, asignacionId: null, listaId: 105, listaTrabId: null, lpId: 105, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-09T15:00:00Z', hora: 15, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 0, turnoCliente: 1 },
      { id: 1009, tareaId: 1, asignacionId: null, listaId: 106, listaTrabId: null, lpId: 106, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 4, cronCliente: 2, turnoId: null, cronEstado: 1, turnoCliente: null },
      { id: 1010, tareaId: 4, asignacionId: null, listaId: 107, listaTrabId: null, lpId: 107, n_empleado: 122, sectoreId: 200, fechaUtc: '2026-01-05T04:00:00Z', hora: 4, cronId: 5, cronCliente: 2, turnoId: 6, cronEstado: 0, turnoCliente: 2 },
      { id: 1011, tareaId: 1, asignacionId: 700, listaId: 109, listaTrabId: null, lpId: 109, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 },
      { id: 1012, tareaId: 1, asignacionId: null, listaId: 108, listaTrabId: null, lpId: 108, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-02-01T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 0, turnoCliente: 1 }
    ],
    lineasSup: [
      { id: 2001, tareaId: 1, asignacionId: null, listaId: 201, listaTrabId: null, stId: 201, lpId: 101 },
      { id: 2002, tareaId: null, asignacionId: null, listaId: 201, listaTrabId: null, stId: 201, lpId: 101 },
      { id: 2003, tareaId: 1, asignacionId: null, listaId: null, listaTrabId: null, stId: null, lpId: null },
      { id: 2004, tareaId: 1, asignacionId: null, listaId: 202, listaTrabId: null, stId: 202, lpId: null },
      { id: 2005, tareaId: 4, asignacionId: null, listaId: 201, listaTrabId: null, stId: 201, lpId: 101 },
      { id: 2006, tareaId: 1, asignacionId: null, listaId: 201, listaTrabId: null, stId: 201, lpId: 101 }
    ]
  };
}

/** Estado "ya migrado": todo vinculado; una segunda corrida de aplicar no debe agregar nada. */
function fixturesMigradas() {
  return {
    tareas: [
      { id: 1, nombre: 'Barrer', estado: 1, areaId: 10, actividadId: 500, sectoreId: 100, clienteId: 1, clave: 'barrer' }
    ],
    actividades: [{ id: 500, cliente_id: 1, origen: 'APP', clave: 'trapear' }],
    trabajadores: [{ id: 11, n_empleado: 120, estado: 1 }],
    existentes: [
      { id: 700, actividad_id: 500, area_id: 10, trabajador_id: 11, turno_id: 5, origen: 'APP', estado: 'ACTIVA', desde: '2026-01-01', hasta: null }
    ],
    lineasPev: [
      { id: 1001, tareaId: 1, asignacionId: 700, listaId: 101, listaTrabId: null, lpId: 101, n_empleado: 120, sectoreId: 100, fechaUtc: '2026-03-02T04:00:00Z', hora: 4, cronId: 3, cronCliente: 1, turnoId: 5, cronEstado: 1, turnoCliente: 1 }
    ],
    lineasSup: [
      { id: 2001, tareaId: 1, asignacionId: 700, listaId: 201, listaTrabId: null, stId: 201, lpId: 101 }
    ]
  };
}

module.exports = { falsoSequelize: falsoSequelize, fixturesBase: fixturesBase, fixturesMigradas: fixturesMigradas };
