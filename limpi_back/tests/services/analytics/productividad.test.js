/**
 * RF-BI-04 — services/analytics/productividad: filtros, período en Santiago (fechaLinea D-117), identificación del
 * trabajador y agregaciones puras de cumplimiento, verificación y observaciones.
 */
const s = require('../../../services/analytics/productividad');

const R = { desde: '2026-10', hasta: '2026-11', cliente_id: null, supervisor: null };
const personas = s.indicePersonas([
  { id: 1, nombre: 'Ana', apellido: 'Díaz', n_empleado: 1001 },
  { id: 2, nombre: 'Luis', apellido: 'Soto', n_empleado: 1002 },
  { id: 3, nombre: 'Rep', apellido: 'Uno', n_empleado: 1009 },
  { id: 4, nombre: 'Rep', apellido: 'Dos', n_empleado: 1009 }
]);
const pev = (o) => Object.assign({ c1: 1, c2: 1, c3: 1, trabajador_id: 1, n_empleado: 1001, supervisor_n: 1002, lista_id: 1, sector_id: 5,
  sector: 'Salas', cliente_id: 9, cliente: 'Clínica', fecha: '2026-11-03', observaciones: null }, o);
const sup = (o) => Object.assign({ h1: '10:00:00', h2: '12:00:00', h3: '15:00:00', supervisor_n: 1002, lista_super_id: 1, lista_super_estado: 2,
  sector_id: 5, sector: 'Salas', cliente_id: 9, fecha: '2026-11-03', observaciones: null }, o);
const detalles = async (fn) => { try { await fn(); } catch (e) { return e.code; } return null; };

describe('filtros', () => {
  it('por defecto 3 meses hasta `hasta`; valida período, cliente y supervisor', async () => {
    expect(s.filtros({ hasta: '2026-11' })).toEqual({ desde: '2026-09', hasta: '2026-11', cliente_id: null, supervisor: null });
    expect(s.filtros({ hasta: '2026-11', cliente_id: '4', supervisor: '1002' })).toMatchObject({ cliente_id: 4, supervisor: 1002 });
    expect(await detalles(() => s.filtros({ hasta: 'x' }))).toBe('PERIODO_INVALIDO');
    expect(await detalles(() => s.filtros({ hasta: '2026-11', desde: '2026-12' }))).toBe('RANGO_INVALIDO');
    expect(await detalles(() => s.filtros({ supervisor: '-1' }))).toBe('CAMPO_INVALIDO');
  });
});

describe('delPeriodo', () => {
  const fila = (fecha_utc, hora_utc, o) => Object.assign({ fecha_utc: fecha_utc, hora_utc: hora_utc, cliente_id: 9, supervisor_n: 1002 }, o);

  it('medianoche de Santiago guardada en UTC (hora 3/4) cuenta en el día de Santiago; sin fecha o futura se excluye', () => {
    const r = s.delPeriodo([
      fila('2026-10-01T03:00:00Z', 3), // 1-oct en Santiago
      fila('2026-12-01T03:00:00Z', 3), // 1-dic: fuera del rango
      fila('2026-11-20T18:00:00Z', 18), // hora atípica: fecha UTC
      fila('2026-11-25T03:00:00Z', 3), // futura respecto de hoy
      fila(null, null)
    ], R, '2026-11-21');
    expect(r.map((f) => f.fecha)).toEqual(['2026-10-01', '2026-11-20']);
  });

  it('filtra por cliente y por supervisor', () => {
    const filas = [fila('2026-11-02T03:00:00Z', 3), fila('2026-11-02T03:00:00Z', 3, { cliente_id: 8, supervisor_n: 1005 })];
    expect(s.delPeriodo(filas, Object.assign({}, R, { cliente_id: 8 }), '2026-11-21')).toHaveLength(1);
    expect(s.delPeriodo(filas, Object.assign({}, R, { supervisor: 1002 }), '2026-11-21')).toHaveLength(1);
  });
});

describe('armarTrabajadores', () => {
  it('pasos marcados / (tareas × 3), días distintos; peor cumplimiento primero', () => {
    const r = s.armarTrabajadores([
      pev({}), pev({ c3: 0, fecha: '2026-11-04' }),
      pev({ trabajador_id: 2, n_empleado: 1002 })
    ], personas);
    expect(r).toEqual([
      { trabajador_id: 1, nombre: 'Ana Díaz', n_empleado: 1001, dias: 2, tareas: 2, pasos_asignados: 6, pasos_marcados: 5, cumplimiento_pct: 83.3 },
      { trabajador_id: 2, nombre: 'Luis Soto', n_empleado: 1002, dias: 1, tareas: 1, pasos_asignados: 3, pasos_marcados: 3, cumplimiento_pct: 100 }
    ]);
  });

  it('sin asignación: n_empleado si es único; si no, "Sin identificar"', () => {
    const r = s.armarTrabajadores([pev({ trabajador_id: null, n_empleado: 1002 }), pev({ trabajador_id: null, n_empleado: 1009 })], personas);
    expect(r.map((f) => [f.trabajador_id, f.nombre])).toEqual([[2, 'Luis Soto'], [null, 'Sin identificar (N° 1009)']]);
  });
});

describe('armarSupervisores', () => {
  it('rondas con hora / (tareas × 3); listas firmadas; ranking de mayor a menor', () => {
    const r = s.armarSupervisores([
      sup({}), sup({ h3: null, lista_super_id: 2, lista_super_estado: 1 }),
      sup({ supervisor_n: 1001, lista_super_id: 3 })
    ], personas);
    expect(r).toEqual([
      { posicion: 1, n_empleado: 1001, trabajador_id: 1, nombre: 'Ana Díaz', listas: 1, listas_firmadas: 1, tareas: 1, rondas_asignadas: 3, rondas_verificadas: 3, verificacion_pct: 100 },
      { posicion: 2, n_empleado: 1002, trabajador_id: 2, nombre: 'Luis Soto', listas: 2, listas_firmadas: 1, tareas: 2, rondas_asignadas: 6, rondas_verificadas: 5, verificacion_pct: 83.3 }
    ]);
  });
});

describe('armarSectores', () => {
  it('observaciones de trabajador y supervisor (texto no vacío); más observaciones primero', () => {
    const r = s.armarSectores(
      [pev({ observaciones: 'faltó jabón' }), pev({ observaciones: '  ' }), pev({ sector_id: 6, sector: 'Baños', c1: 0 })],
      [sup({ observaciones: 'piso húmedo' }), sup({ sector_id: 6, sector: 'Baños' })]
    );
    expect(r.map((f) => [f.sector, f.tareas, f.cumplimiento_pct, f.observaciones, f.observaciones_trabajador, f.observaciones_supervisor]))
      .toEqual([['Salas', 2, 100, 2, 1, 1], ['Baños', 1, 66.7, 0, 0, 0]]);
  });
});
