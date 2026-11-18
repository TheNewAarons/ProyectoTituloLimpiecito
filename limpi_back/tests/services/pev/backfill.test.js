'use strict';

/**
 * RF-PEV-02b — services/pev/backfill.js sin BD: `sequelize.query` simulado por patrón de SQL
 * (helper falsoSequelize.js). Foco (TASK_PLAN §2.1 tabla B, §2.2 C1–C4):
 *  (a) el historial de cumplimiento no se toca: los UPDATE solo escriben actividadId/asignacionId
 *      donde está NULL; nunca check_trabajador_*, hora_check_*, observaciones ni tareaId;
 *  (b) los conteos del plan cuadran (enlazadas + NULL por motivo = total; líneas por asignación;
 *      claves distintas; 3 pasos por actividad BACKFILL; 0 ACTIVA duplicadas);
 *  (c) fechaLinea D-117; (d) revertir y su guardia; (e) idempotencia de una segunda corrida.
 */
const backfill = require('../../../services/pev/backfill');
const { falsoSequelize, fixturesBase, fixturesMigradas } = require('./falsoSequelize');

const UPDATES_LEGACY = /^UPDATE `(tareas|linea_lista_pev_trabajadores|linea_lista_super_trabajadores)` SET `(actividadId|asignacionId)` = :v WHERE id IN \(:ids\) AND `[^`]+` IS NULL$/;

describe('planificar', () => {
  let plan;
  beforeEach(async () => {
    plan = await backfill.planificar(falsoSequelize(fixturesBase()));
  });

  test('tareas → actividad: homónimas por área comparten actividad; sufijo " 1" es otra; exclusiones por motivo', () => {
    const nombres = plan.actividadesNuevas.map((a) => a.nombre).sort();
    expect(nombres).toEqual(['Barrer', 'Barrer 1']); // 'Barrer' une las tareas 1 y 2; 'Barrer 1' no se une (conservador)
    expect(plan.actividadesNuevas.every((a) => a.cliente_id === 1 && a.id === null)).toBe(true);
    expect(plan.resumen.actividades.reutilizadas).toBe(1); // 'Trapear' de cliente 2 → actividad 501 APP
    expect(plan.resumen.tareas.vinculadas_antes).toBe(1); // tarea 7 ya tenía actividadId
    expect(plan.resumen.tareas.a_vincular).toBe(4); // tareas 1, 2, 3 y 4
    expect(plan.resumen.tareas.excluidas).toEqual({ SIN_CLIENTE: 1, NOMBRE_INVALIDO: 1 });
    expect(plan.resumen.posibles_duplicados.grupos).toBe(1); // 'Barrer' vs 'Barrer 1' reportado para 02c
    // Cada tarea a vincular apunta a la actividad de su (cliente, clave)
    const destinoPorTarea = new Map(plan.tareas.map((v) => [v.id, v.destino]));
    expect(destinoPorTarea.get(1)).toBe(destinoPorTarea.get(2));
    expect(destinoPorTarea.get(3)).not.toBe(destinoPorTarea.get(1));
    expect(destinoPorTarea.get(4).id).toBe(501);
  });

  test('líneas PEV: agrupa por (actividad, área, trabajador, turno) y excluye por motivo C2/C3', () => {
    expect(plan.asignacionesNuevas.length).toBe(2);
    const g1 = plan.asignacionesNuevas.find((a) => a.area_id === 10);
    const g2 = plan.asignacionesNuevas.find((a) => a.area_id === 11);
    expect(g1.lineas).toBe(3); // 1001, 1008 y 1012
    expect(g1.desde).toBe('2026-02-01');
    expect(g1.hasta).toBeNull(); // ACTIVA: cronograma activo + puente activo + trabajador activo, sin APP ACTIVA en la clave
    expect(g1.estado).toBe('ACTIVA');
    expect(g1.trabajador_id).toBe(11);
    expect(g1.turno_id).toBe(5);
    expect(g2.lineas).toBe(1); // 1002
    expect(g2.estado).toBe('CERRADA'); // puente (tarea 2) inactiva
    expect(g2.hasta).toBe('2026-03-02');
    expect(plan.resumen.lineas_pev.excluidas).toEqual({
      TAREA_NULL: 1, LISTA_INEXISTENTE: 1, FECHA_NULL: 1,
      TRABAJADOR_INEXISTENTE: 1, N_EMPLEADO_AMBIGUO: 1, CLIENTE_INCONSISTENTE: 1
    });
    expect(plan.resumen.avisos.HORA_ATIPICA_LINEAS).toBe(1); // línea 1008, hora UTC 15
    // Línea dentro de la vigencia de la APP 800 → reutiliza la APP, no crea BACKFILL
    const aApp = plan.lpev.find((v) => v.id === 1010);
    expect(aApp.destino.id).toBe(800);
    expect(plan.resumen.lineas_pev.a_existente).toEqual({ APP: 1, BACKFILL: 0 });
    expect(plan.resumen.lineas_pev.enlazadas_antes).toBe(1); // 1011 ya tenía asignacionId
  });

  test('asignación existente: APP gana sobre BACKFILL; dos APP vigentes en la fecha → ASIGNACION_AMBIGUA (regla de resolverAsignacion)', async () => {
    const clave = { actividad_id: 501, area_id: 20, trabajador_id: 14, turno_id: 6 };
    const conBackfill = fixturesBase();
    conBackfill.existentes.push(Object.assign({ id: 801, origen: 'BACKFILL', estado: 'CERRADA', desde: '2026-01-01', hasta: '2026-01-10' }, clave));
    const p1 = await backfill.planificar(falsoSequelize(conBackfill));
    expect(p1.lpev.find((v) => v.id === 1010).destino.id).toBe(800);

    const dosApp = fixturesBase();
    dosApp.existentes.push(Object.assign({ id: 802, origen: 'APP', estado: 'CERRADA', desde: '2026-01-01', hasta: '2026-01-10' }, clave));
    const p2 = await backfill.planificar(falsoSequelize(dosApp));
    expect(p2.lpev.find((v) => v.id === 1010)).toBeUndefined();
    expect(p2.resumen.lineas_pev.excluidas.ASIGNACION_AMBIGUA).toBe(1);
    expect(p2.asignacionesNuevas.length).toBe(2); // no crea BACKFILL para la línea ambigua
  });

  test('(b) conteos: total = enlazadas + a enlazar + NULL por motivo; líneas por asignación; claves; pasos; ACTIVA única', () => {
    const lp = plan.resumen.lineas_pev;
    const excluidas = Object.keys(lp.excluidas).reduce((s, k) => s + lp.excluidas[k], 0);
    expect(lp.total).toBe(12);
    expect(lp.enlazadas_antes + lp.a_backfill_nueva + lp.a_existente.APP + lp.a_existente.BACKFILL + excluidas).toBe(lp.total);
    const lineasEnNuevas = plan.asignacionesNuevas.reduce((s, a) => s + a.lineas, 0);
    expect(lineasEnNuevas).toBe(lp.a_backfill_nueva); // 4 = líneas enlazadas a BACKFILL nuevo
    expect(plan.lpev.length).toBe(lp.a_backfill_nueva + lp.a_existente.APP);
    // Actividades BACKFILL + APP reutilizadas = claves distintas usadas
    expect(plan.resumen.actividades.nuevas_backfill + plan.resumen.actividades.reutilizadas).toBe(3);
    expect(plan.resumen.actividades.pasos_nuevos).toBe(plan.resumen.actividades.nuevas_backfill * 3);
    // 0 ACTIVA duplicadas: a lo sumo una ACTIVA nueva y ninguna sobre la clave de la APP 700
    expect(plan.resumen.asignaciones.por_estado).toEqual({ ACTIVA: 1, CERRADA: 1 });
    const activas = plan.asignacionesNuevas.filter((a) => a.estado === 'ACTIVA');
    expect(activas.length).toBe(1);
    expect(activas[0].ref.id).not.toBe(500); // no pisa la ACTIVA APP de la actividad 500
    // Supervisor: copia la asignación de la línea PEV de su lista con el mismo tareaId
    expect(plan.resumen.lineas_super.total).toBe(6);
    expect(plan.resumen.lineas_super.a_enlazar).toBe(2); // 2001 y 2006
    expect(plan.resumen.lineas_super.excluidas).toEqual({
      TAREA_NULL: 1, LISTA_INEXISTENTE: 1, LISTA_PEV_INEXISTENTE: 1, SIN_LINEA_PEV: 1
    });
    const d1 = plan.lsup.find((v) => v.id === 2001).destino;
    expect(plan.lsup.find((v) => v.id === 2006).destino).toBe(d1);
    expect(d1).toBe(plan.lpev.find((v) => v.id === 1001).destino);
  });
});

describe('fechaLinea (D-117/C1)', () => {
  test('hora UTC 3 o 4 = medianoche Santiago → fecha en America/Santiago', () => {
    expect(backfill.fechaLinea('2026-03-02T04:00:00Z', 4)).toBe('2026-03-02'); // verano UTC-3
    expect(backfill.fechaLinea('2026-06-10T03:30:00Z', 3)).toBe('2026-06-09'); // invierno UTC-4: aún es el día anterior
  });
  test('otra hora → DATE() sin convertir (caso HORA_ATIPICA); null → null', () => {
    expect(backfill.fechaLinea('2026-06-10T23:00:00Z', 23)).toBe('2026-06-10');
    expect(backfill.fechaLinea('2026-03-09T15:00:00Z', 15)).toBe('2026-03-09');
    expect(backfill.fechaLinea(null, 4)).toBeNull();
  });
});

describe('aplicar', () => {
  test('(a) solo escribe actividadId/asignacionId donde NULL: el historial de cumplimiento queda intacto', async () => {
    const seq = falsoSequelize(fixturesBase());
    const r = await backfill.aplicar(seq);
    // CREATE TABLE del log fuera de la transacción y una sola transacción global READ_COMMITTED (C5/D-119)
    expect(seq.calls[0]).toMatch(/^CREATE TABLE IF NOT EXISTS `pev_backfill_log`/);
    expect(seq.transaction).toHaveBeenCalledTimes(1);
    const updates = seq.calls.filter((s) => /^UPDATE `/.test(s));
    expect(updates.length).toBeGreaterThan(0);
    updates.forEach((sql) => expect(sql).toMatch(UPDATES_LEGACY));
    // Ningún SQL toca el historial de cumplimiento (K-2/K-13/K-14)
    seq.calls.forEach((sql) => {
      expect(sql).not.toMatch(/check_trabajador|hora_check|observaciones|n_empleado\s*=|tareaId\s*=/);
    });
    // Inserciones con origen BACKFILL: 2 actividades, 6 pasos (3 c/u), 2 asignaciones
    expect(seq.calls.filter((s) => /^INSERT INTO actividades /.test(s)).length).toBe(2);
    expect(seq.calls.filter((s) => /^INSERT INTO actividad_pasos /.test(s)).length).toBe(6);
    expect(seq.calls.filter((s) => /^INSERT INTO actividad_asignaciones /.test(s)).length).toBe(2);
    const insAsig = seq.query.mock.calls.filter((c) => /^INSERT INTO actividad_asignaciones /.test(c[0]));
    insAsig.forEach((c) => expect(c[0]).toContain("'BACKFILL'"));
    const flags = insAsig.map((c) => c[1].replacements.flag);
    expect(flags).toHaveLength(2);
    expect(flags).toEqual(expect.arrayContaining([null, 1])); // ACTIVA flag=1, CERRADA flag NULL (K-9)
    // Log: 2 actividades + 6 pasos + 4 tareas + 2 asignaciones + 5 líneas PEV + 2 supervisor = 21
    expect(r.filas_log).toBe(21);
    const insLog = seq.query.mock.calls.filter((c) => /^INSERT INTO `pev_backfill_log`/.test(c[0]));
    expect(insLog.length).toBe(1);
    expect(insLog[0][1].replacements.length).toBe(21 * 5);
    const aud = seq.query.mock.calls.find((c) => /^INSERT INTO auditoria /.test(c[0]));
    expect(aud[1].replacements.accion).toBe('MIGRACION');
    // Los UPDATE de líneas llevan los ids esperados por destino
    const updPev = seq.query.mock.calls.filter((c) => /^UPDATE `linea_lista_pev_trabajadores`/.test(c[0]));
    const porDestino = new Map(updPev.map((c) => [c[1].replacements.v, c[1].replacements.ids]));
    expect(porDestino.get(800)).toEqual([1010]); // vigente en la APP 800
    const nuevosIds = Array.from(porDestino.keys()).filter((k) => k !== 800);
    expect(nuevosIds.length).toBe(2); // una UPDATE por asignación BACKFILL nueva
    const enlazadasANuevas = nuevosIds.reduce((acc, k) => acc.concat(porDestino.get(k)), []).sort((a, b) => a - b);
    expect(enlazadasANuevas).toEqual([1001, 1002, 1008, 1012]);
    // La línea 1011 (ya enlazada) y las excluidas no aparecen en ningún UPDATE
    const todosLosIds = seq.query.mock.calls
      .filter((c) => /^UPDATE `/.test(c[0]))
      .reduce((acc, c) => acc.concat(c[1].replacements.ids || []), []);
    [1003, 1004, 1005, 1006, 1007, 1009, 1011].forEach((id) => expect(todosLosIds).not.toContain(id));
  });

  test('(e) segunda corrida con todo ya vinculado no agrega nada (idempotente)', async () => {
    const seq = falsoSequelize(fixturesMigradas(), { maxLote: 1 });
    const r = await backfill.aplicar(seq);
    expect(r.filas_log).toBe(0);
    expect(r.lote).toBe(2);
    expect(seq.calls.filter((s) => /^INSERT INTO `pev_backfill_log`/.test(s)).length).toBe(0);
    expect(seq.calls.filter((s) => /^INSERT INTO auditoria /.test(s)).length).toBe(0); // sin operación, sin auditoría
    expect(seq.calls.filter((s) => /^UPDATE `/.test(s)).length).toBe(0);
    expect(seq.calls.filter((s) => /^INSERT INTO actividades /.test(s)).length).toBe(0);
  });
});

describe('revertir', () => {
  test('(d) sin uso posterior: desenlaza, borra solo lo CREAR del log, vacía el log y lo elimina', async () => {
    const dropTable = jest.fn(async () => {});
    const seq = falsoSequelize({}, { logExiste: true, maxLote: 1, filasLog: 21, updateCount: 5, deleteCount: 2, dropTable: dropTable });
    const r = await backfill.revertir(seq);
    expect(r.revertido).toBe(true);
    expect(r.filas_log).toBe(21);
    expect(Object.keys(r.detalle)).toEqual(expect.arrayContaining([
      'linea_lista_super_trabajadores', 'linea_lista_pev_trabajadores', 'tareas',
      'borradas_actividad_asignaciones', 'borradas_actividad_pasos', 'borradas_actividades'
    ]));
    // Desenlaza supervisor → PEV → tareas, solo donde sigue el valor del log
    const upds = seq.calls.filter((s) => /^UPDATE `/.test(s));
    expect(upds.length).toBe(3);
    expect(upds[0]).toContain('UPDATE `linea_lista_super_trabajadores`');
    expect(upds[1]).toContain('UPDATE `linea_lista_pev_trabajadores`');
    expect(upds[2]).toContain('UPDATE `tareas`');
    upds.forEach((sql) => {
      expect(sql).toContain('= NULL');
      expect(sql).toContain("g.accion = 'VINCULAR'");
      expect(sql).toContain('= g.valor_nuevo');
    });
    // Borra hijas antes que padres y solo lo CREAR
    const dels = seq.calls.filter((s) => /^DELETE x FROM/.test(s));
    expect(dels.map((s) => s.match(/DELETE x FROM `([^`]+)`/)[1]))
      .toEqual(['actividad_asignaciones', 'actividad_pasos', 'actividades']);
    dels.forEach((sql) => expect(sql).toContain("g.accion = 'CREAR'"));
    expect(seq.calls).toContain('DELETE FROM `pev_backfill_log`');
    const aud = seq.query.mock.calls.find((c) => /^INSERT INTO auditoria /.test(c[0]));
    expect(aud[1].replacements.accion).toBe('REVERSION_MIGRACION');
    expect(dropTable).toHaveBeenCalledWith('pev_backfill_log');
  });

  test('(d) la guardia aborta sin cambios si hubo uso posterior (fila ajena en actividad BACKFILL)', async () => {
    const dropTable = jest.fn(async () => {});
    const seq = falsoSequelize({}, { logExiste: true, guardias: { 'FROM tareas x JOIN': 2 }, dropTable: dropTable });
    await expect(backfill.revertir(seq)).rejects.toThrow(/down abortado sin cambios.*TAREA_AJENA_EN_ACTIVIDAD_BACKFILL=2/);
    expect(seq.calls.filter((s) => /^UPDATE `/.test(s)).length).toBe(0);
    expect(seq.calls.filter((s) => /^DELETE/.test(s)).length).toBe(0);
    expect(dropTable).not.toHaveBeenCalled();
  });

  test('(d) la guardia aborta si una asignación BACKFILL fue modificada después', async () => {
    const seq = falsoSequelize({}, { logExiste: true, guardias: { 'x.updated_at <> x.created_at': 1 } });
    await expect(backfill.revertir(seq)).rejects.toThrow(/ASIGNACION_BACKFILL_MODIFICADA=1/);
    expect(seq.calls.filter((s) => /^UPDATE `/.test(s)).length).toBe(0);
  });

  test('sin tabla de log (up nunca corrió) es no-op', async () => {
    const seq = falsoSequelize({}, { logExiste: false });
    const r = await backfill.revertir(seq);
    expect(r).toEqual({ revertido: false });
    expect(seq.transaction).not.toHaveBeenCalled();
  });
});
