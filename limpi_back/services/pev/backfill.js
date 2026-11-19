'use strict';

/**
 * RF-PEV-02b — Backfill M2 de actividades y asignaciones (TASK_PLAN "RF-PEV-02 — Diseño final" §2.1/§2.2,
 * D-112…D-121). Recibe una instancia Sequelize (la de queryInterface en la migración, la de
 * database/database.js en el dry-run): SQL crudo con replacements, SIN cargar modelos.
 * - planificar: solo lectura; devuelve lo que se escribiría + resumen (K) + exclusiones por motivo.
 * - aplicar: DDL idempotente de pev_backfill_log (autocommit) + una transacción global READ_COMMITTED (D-119).
 *   Solo escribe columnas de 02a que están en NULL (WHERE col IS NULL) y crea filas origen='BACKFILL'.
 * - revertir: guardia (aborta sin cambios si hubo uso posterior, §2.1-G) → vuelve a NULL lo registrado →
 *   borra solo lo CREAR del log → vacía el log; luego dropTable del log.
 * Auditoría: 1 fila por corrida con INSERT directo en `auditoria` (services/auditoria usa el modelo ligado
 * a database/database.js: otra conexión y otra transacción que la de queryInterface).
 * Identificadores de tabla/columna en SQL son constantes de este archivo (nunca entrada externa).
 */

const Sequelize = require('sequelize');

const Q = Sequelize.QueryTypes;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;
const LOG = 'pev_backfill_log';
const LARGO_NOMBRE = 100;
const SUBLOTE = 1000;
const ZONA = 'America/Santiago';
const HASTA_INF = '9999-12-31';
const DIAS_HUECO = 31;
const NULO = '~NULL~'; // centinela de K-2: CONCAT_WS omite los NULL (D-120)
// Copia de services/pev/actividades.js#PASOS_DEFECTO: ese módulo carga database.js (.env) y no sirve desde la migración
const PASOS_DEFECTO = [
  { orden: 1, nombre: 'Despolvado', columna_legacy: 'despolvado' },
  { orden: 2, nombre: 'Aplicación de producto', columna_legacy: 'aplicacion_producto' },
  { orden: 3, nombre: 'Abrillantado', columna_legacy: 'abrillantado' }
];
const E = {
  act: 'actividades',
  pasos: 'actividad_pasos',
  asig: 'actividad_asignaciones',
  tareas: 'tareas',
  lpev: 'linea_lista_pev_trabajadores',
  lsup: 'linea_lista_super_trabajadores'
};
// Orden de locks de 02a (§2.1-F)
const ORDEN_LOCKS = [E.act, E.tareas, E.asig, E.lpev, E.lsup];
const LEGACY_CONTEOS = ['tareas', 'turnos_tareas', 'linea_cronogramas', 'checkeos', 'trabajadores_cronogramas',
  'listas_pev_trabajadores', 'linea_lista_pev_trabajadores', 'listas_super_trabajadores', 'linea_lista_super_trabajadores'];
const COLS_K2 = {
  tareas: ['id', 'nombre', 'estado', 'areaId'],
  linea_lista_pev_trabajadores: ['id', 'check_trabajador_1', 'hora_check_trabajador_1', 'check_trabajador_2',
    'hora_check_trabajador_2', 'check_trabajador_3', 'hora_check_trabajador_3', 'observaciones', 'listaPevTrabId',
    'tareaId', 'listasPevTrabajadoreId'],
  linea_lista_super_trabajadores: ['id', 'hora_1', 'despolvado_1', 'aplicacion_producto_1', 'abrillantado_1', 'hora_2',
    'despolvado_2', 'aplicacion_producto_2', 'abrillantado_2', 'hora_3', 'despolvado_3', 'aplicacion_producto_3',
    'abrillantado_3', 'observaciones', 'listaSuperTrabId', 'tareaId', 'listasSuperTrabajadoreId']
};

function consulta(sequelize, transaction) {
  return function (sql, replacements, type) {
    return sequelize.query(sql, { replacements: replacements || {}, type: type || Q.SELECT, transaction: transaction });
  };
}

function contar(obj, motivo) {
  obj[motivo] = (obj[motivo] || 0) + 1;
}

const FORMATO_SANTIAGO = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Fecha de negocio de una lista PEV (D-117): hora UTC 3 o 4 = medianoche de Santiago guardada por
 * `new Date(datepicker)` → fecha en Santiago; cualquier otra hora → DATE() sin convertir (HORA_ATIPICA).
 * La reutiliza resolverAsignacion (B2).
 * @param {string|null} fechaUtc 'YYYY-MM-DDTHH:mm:ssZ'
 * @param {number|null} hora HOUR() UTC de la misma fecha
 * @returns {string|null} 'YYYY-MM-DD'
 */
function fechaLinea(fechaUtc, hora) {
  if (!fechaUtc) return null;
  if (hora === 3 || hora === 4) return FORMATO_SANTIAGO.format(new Date(fechaUtc));
  return fechaUtc.slice(0, 10);
}

function diasEntre(a, b) {
  return (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000;
}

function baseDuplicado(nombre) {
  return nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').replace(/\s*\d+$/, '').trim();
}

/**
 * Solo lectura. Calcula el backfill completo en memoria (§2.1-A…D, §2.2-C1…C4).
 * @param {object} sequelize instancia Sequelize v4
 * @param {{transaction?: object}} [opciones]
 * @returns {Promise<object>} plan con `resumen` serializable (K y exclusiones) e internos para aplicar()
 */
async function planificar(sequelize, opciones) {
  const q = consulta(sequelize, (opciones || {}).transaction);
  const CLAVE_COLLATION = 'HEX(WEIGHT_STRING(CONVERT(%s USING utf8mb4) COLLATE utf8mb4_unicode_ci))';

  const tareas = await q(
    'SELECT t.id, TRIM(t.nombre) AS nombre, t.estado, t.areaId, t.actividadId, a.sectoreId, s.clienteId, ' +
      CLAVE_COLLATION.replace('%s', 'TRIM(t.nombre)') + ' AS clave ' +
      'FROM tareas t LEFT JOIN areas a ON a.id = t.areaId LEFT JOIN sectores s ON s.id = a.sectoreId ORDER BY t.id'
  );
  const actividades = await q('SELECT id, cliente_id, origen, ' + CLAVE_COLLATION.replace('%s', 'nombre') +
    ' AS clave FROM actividades ORDER BY id');
  const trabajadores = await q('SELECT id, n_empleado, estado FROM trabajadores WHERE n_empleado IS NOT NULL ORDER BY id');
  const existentes = await q(
    "SELECT id, actividad_id, area_id, trabajador_id, turno_id, origen, estado, DATE_FORMAT(fecha_desde, '%Y-%m-%d') AS desde, " +
      "DATE_FORMAT(fecha_hasta, '%Y-%m-%d') AS hasta FROM actividad_asignaciones WHERE estado <> 'ANULADA' ORDER BY id"
  );
  const lineasPev = await q(
    'SELECT l.id, l.tareaId, l.asignacionId, l.listasPevTrabajadoreId AS listaId, l.listaPevTrabId AS listaTrabId, ' +
      "lp.id AS lpId, lp.n_empleado, lp.sectoreId, DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fechaUtc, " +
      'HOUR(lp.fecha_chequeo) AS hora, c.id AS cronId, c.clienteId AS cronCliente, c.turnoId, c.estado AS cronEstado, ' +
      'tu.clienteId AS turnoCliente ' +
      'FROM linea_lista_pev_trabajadores l ' +
      'LEFT JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
      'LEFT JOIN cronogramas c ON c.id = lp.cronogramaId ' +
      'LEFT JOIN turnos tu ON tu.id = c.turnoId ORDER BY l.id'
  );
  const lineasSup = await q(
    'SELECT ls.id, ls.tareaId, ls.asignacionId, ls.listasSuperTrabajadoreId AS listaId, ls.listaSuperTrabId AS listaTrabId, ' +
      'st.id AS stId, st.listasPevTrabajadoreId AS lpId ' +
      'FROM linea_lista_super_trabajadores ls ' +
      'LEFT JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ORDER BY ls.id'
  );

  const excl = { tareas: {}, lpev: {}, lsup: {} };
  const avisos = {};

  // 1. Tareas → actividad (clave cliente + TRIM(nombre) bajo la collation del UNIQUE, D-112)
  const refPorId = new Map();
  const refPorClave = new Map();
  actividades.forEach(function (a) {
    const ref = { id: a.id, origen: a.origen, k: 'e' + a.id };
    refPorId.set(a.id, ref);
    refPorClave.set(a.cliente_id + '|' + a.clave, ref);
  });
  const nuevas = [];
  const reutilizadas = new Set();
  const vincTareas = [];
  const tareaRef = new Map();
  const tareaInfo = new Map();
  let tareasVinculadasAntes = 0;
  for (const t of tareas) {
    tareaInfo.set(t.id, t);
    if (t.actividadId !== null) {
      tareasVinculadasAntes++;
      tareaRef.set(t.id, refPorId.get(t.actividadId));
      continue;
    }
    if (t.clienteId === null) { contar(excl.tareas, 'SIN_CLIENTE'); continue; }
    const n = t.nombre;
    // trim() de JS = el de actividades.js; si difiere del TRIM de SQL (tabs, saltos) no se adivina
    if (!n || n.trim() !== n || Array.from(n).length > LARGO_NOMBRE) { contar(excl.tareas, 'NOMBRE_INVALIDO'); continue; }
    const clave = t.clienteId + '|' + t.clave;
    let ref = refPorClave.get(clave);
    if (!ref) {
      ref = { id: null, origen: 'BACKFILL', k: 'n' + nuevas.length, cliente_id: t.clienteId, nombre: n, estado: 0 };
      refPorClave.set(clave, ref);
      nuevas.push(ref);
    } else if (ref.k.charAt(0) === 'e') {
      reutilizadas.add(ref.id);
    }
    if (ref.k.charAt(0) === 'n' && t.estado === 1) ref.estado = 1;
    vincTareas.push({ id: t.id, destino: ref });
    tareaRef.set(t.id, ref);
  }

  // Puente por (actividad, área): activa de menor id; si ninguna, la de menor id (§2.1-C)
  const puentes = new Map();
  const porBase = new Map();
  for (const t of tareas) {
    const ref = tareaRef.get(t.id);
    if (!ref) continue;
    if (t.areaId !== null) {
      if (!puentes.has(ref)) puentes.set(ref, new Map());
      const m = puentes.get(ref);
      const p = m.get(t.areaId);
      if (!p || (p.estado !== 1 && t.estado === 1)) m.set(t.areaId, t);
    }
    if (t.nombre && t.clienteId !== null) {
      const b = t.clienteId + '|' + baseDuplicado(t.nombre);
      if (!porBase.has(b)) porBase.set(b, new Map());
      porBase.get(b).set(ref.k, t.nombre);
    }
  }
  const posiblesDuplicados = [];
  porBase.forEach(function (m, b) {
    if (m.size > 1) posiblesDuplicados.push({ cliente_id: Number(b.split('|')[0]), nombres: Array.from(m.values()) });
  });

  // 2. Líneas PEV → asignación (D-114, D-117, D-118)
  const trabPorN = new Map();
  trabajadores.forEach(function (tr) {
    if (!trabPorN.has(tr.n_empleado)) trabPorN.set(tr.n_empleado, []);
    trabPorN.get(tr.n_empleado).push(tr);
  });
  const claveAsig = function (refK, area, trab, turno) { return [refK, area, trab, turno === null ? 'N' : turno].join('|'); };
  const exPorClave = new Map();
  existentes.forEach(function (a) {
    const ref = refPorId.get(a.actividad_id);
    const k = claveAsig(ref.k, a.area_id, a.trabajador_id, a.turno_id);
    if (!exPorClave.has(k)) exPorClave.set(k, []);
    exPorClave.get(k).push({ id: a.id, origen: a.origen, estado: a.estado, desde: a.desde, hasta: a.hasta });
  });
  const grupos = new Map();
  const finalPev = new Map(); // id línea PEV → destino final ({id} o asignación nueva)
  let pevEnlazadasAntes = 0;
  for (const l of lineasPev) {
    if (l.asignacionId !== null) { pevEnlazadasAntes++; finalPev.set(l.id, { id: l.asignacionId }); continue; }
    if (l.tareaId === null) { contar(excl.lpev, 'TAREA_NULL'); continue; }
    if (l.listaId === null) { contar(excl.lpev, l.listaTrabId !== null ? 'LISTA_SOLO_EN_TRABID' : 'LISTA_INEXISTENTE'); continue; }
    if (l.lpId === null) { contar(excl.lpev, 'LISTA_INEXISTENTE'); continue; }
    if (!l.fechaUtc) { contar(excl.lpev, 'FECHA_NULL'); continue; }
    const t = tareaInfo.get(l.tareaId);
    const ref = tareaRef.get(l.tareaId);
    if (!t || !ref || t.areaId === null) { contar(excl.lpev, 'TAREA_EXCLUIDA'); continue; }
    const trabs = trabPorN.get(l.n_empleado) || [];
    if (!trabs.length) { contar(excl.lpev, 'TRABAJADOR_INEXISTENTE'); continue; }
    if (trabs.length > 1) { contar(excl.lpev, 'N_EMPLEADO_AMBIGUO'); continue; }
    if (l.cronId === null) { contar(excl.lpev, 'CRONOGRAMA_NULL'); continue; }
    if (l.cronCliente !== t.clienteId || (l.turnoId !== null && l.turnoCliente !== t.clienteId)) {
      contar(excl.lpev, 'CLIENTE_INCONSISTENTE');
      continue;
    }
    if (l.hora !== 3 && l.hora !== 4) contar(avisos, 'HORA_ATIPICA_LINEAS');
    if (l.sectoreId !== t.sectoreId) contar(avisos, 'SECTOR_DISTINTO');
    const k = claveAsig(ref.k, t.areaId, trabs[0].id, l.turnoId);
    if (!grupos.has(k)) grupos.set(k, { ref: ref, area: t.areaId, trab: trabs[0], turno: l.turnoId, lineas: [] });
    grupos.get(k).lineas.push({ id: l.id, fecha: fechaLinea(l.fechaUtc, l.hora), cronEstado: l.cronEstado });
  }

  const vincPev = [];
  const asigNuevas = [];
  const pevPorOrigen = { APP: 0, BACKFILL: 0 };
  grupos.forEach(function (g, k) {
    const ex = exPorClave.get(k) || [];
    const resto = [];
    g.lineas.forEach(function (ln) {
      // Dentro de la vigencia de una asignación existente (APP, o BACKFILL de una corrida previa) → esa.
      // Misma regla que resolverAsignacion: APP gana; más de una candidata → excluida
      const cand = ex.filter(function (e) { return e.desde <= ln.fecha && (e.hasta === null || ln.fecha <= e.hasta); });
      const app = cand.filter(function (e) { return e.origen === 'APP'; });
      const elegidas = app.length ? app : cand;
      if (elegidas.length > 1) { contar(excl.lpev, 'ASIGNACION_AMBIGUA'); return; }
      const a = elegidas[0];
      if (a) {
        vincPev.push({ id: ln.id, destino: a });
        finalPev.set(ln.id, a);
        pevPorOrigen[a.origen === 'APP' ? 'APP' : 'BACKFILL']++;
      } else {
        resto.push(ln);
      }
    });
    if (!resto.length) return;
    const fechas = resto.map(function (x) { return x.fecha; }).sort();
    const desde = fechas[0];
    const hasta = fechas[fechas.length - 1];
    const puente = puentes.get(g.ref).get(g.area);
    const activa = resto.some(function (x) { return x.cronEstado === 1; }) && puente.estado === 1 &&
      g.trab.estado === 1 && !ex.some(function (e) { return e.estado === 'ACTIVA'; });
    const hastaNueva = activa ? null : hasta;
    const solapa = ex.some(function (e) { return desde <= (e.hasta || HASTA_INF) && e.desde <= (hastaNueva || HASTA_INF); });
    if (solapa) { resto.forEach(function () { contar(excl.lpev, 'SOLAPE_APP'); }); return; }
    for (let i = 1; i < fechas.length; i++) {
      if (diasEntre(fechas[i - 1], fechas[i]) > DIAS_HUECO) { contar(avisos, 'ASIGNACION_CON_HUECOS'); break; }
    }
    const nueva = { id: null, ref: g.ref, area_id: g.area, trabajador_id: g.trab.id, turno_id: g.turno, tarea_id: puente.id,
      desde: desde, hasta: hastaNueva, estado: activa ? 'ACTIVA' : 'CERRADA', lineas: resto.length };
    asigNuevas.push(nueva);
    resto.forEach(function (ln) { vincPev.push({ id: ln.id, destino: nueva }); finalPev.set(ln.id, nueva); });
  });

  // 3. Líneas de supervisor: copian la asignación de la línea PEV de su lista con el mismo tareaId
  const pevPorListaTarea = new Map();
  lineasPev.forEach(function (l) {
    if (l.listaId === null || l.tareaId === null) return;
    const k = l.listaId + '|' + l.tareaId;
    if (!pevPorListaTarea.has(k)) pevPorListaTarea.set(k, []);
    pevPorListaTarea.get(k).push(finalPev.get(l.id) || null);
  });
  const vincSup = [];
  let supEnlazadasAntes = 0;
  for (const s of lineasSup) {
    if (s.asignacionId !== null) { supEnlazadasAntes++; continue; }
    if (s.tareaId === null) { contar(excl.lsup, 'TAREA_NULL'); continue; }
    if (s.listaId === null) { contar(excl.lsup, s.listaTrabId !== null ? 'LISTA_SOLO_EN_TRABID' : 'LISTA_INEXISTENTE'); continue; }
    if (s.stId === null) { contar(excl.lsup, 'LISTA_INEXISTENTE'); continue; }
    if (s.lpId === null) { contar(excl.lsup, 'LISTA_PEV_INEXISTENTE'); continue; }
    const pev = pevPorListaTarea.get(s.lpId + '|' + s.tareaId);
    if (!pev) { contar(excl.lsup, 'SIN_LINEA_PEV'); continue; }
    const distintos = pev.filter(function (d, i) { return d !== null && pev.indexOf(d) === i; });
    const ids = new Set(distintos.map(function (d) { return d.id === null ? d : d.id; }));
    if (!ids.size) { contar(excl.lsup, 'LINEA_PEV_SIN_ASIGNACION'); continue; }
    if (ids.size > 1) { contar(excl.lsup, 'ASIGNACION_AMBIGUA'); continue; }
    vincSup.push({ id: s.id, destino: distintos[0] });
  }

  const nuevasPorEstado = { ACTIVA: 0, CERRADA: 0 };
  asigNuevas.forEach(function (a) { nuevasPorEstado[a.estado]++; });
  return {
    actividadesNuevas: nuevas,
    tareas: vincTareas,
    asignacionesNuevas: asigNuevas,
    lpev: vincPev,
    lsup: vincSup,
    resumen: {
      tareas: { total: tareas.length, vinculadas_antes: tareasVinculadasAntes, a_vincular: vincTareas.length, excluidas: excl.tareas },
      actividades: { existentes: actividades.length, nuevas_backfill: nuevas.length, reutilizadas: reutilizadas.size,
        pasos_nuevos: nuevas.length * PASOS_DEFECTO.length },
      asignaciones: { existentes_no_anuladas: existentes.length, nuevas_backfill: asigNuevas.length, por_estado: nuevasPorEstado },
      lineas_pev: { total: lineasPev.length, enlazadas_antes: pevEnlazadasAntes, a_backfill_nueva: vincPev.length - pevPorOrigen.APP - pevPorOrigen.BACKFILL,
        a_existente: pevPorOrigen, excluidas: excl.lpev },
      lineas_super: { total: lineasSup.length, enlazadas_antes: supEnlazadasAntes, a_enlazar: vincSup.length, excluidas: excl.lsup },
      avisos: avisos,
      posibles_duplicados: { grupos: posiblesDuplicados.length, muestra: posiblesDuplicados.slice(0, 20) }
    }
  };
}

async function existeLog(q) {
  const f = await q('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t', { t: LOG });
  return Number(f[0].n) > 0;
}

async function conTimeouts(q, fn) {
  const previo = (await q('SELECT @@SESSION.lock_wait_timeout AS lwt, @@SESSION.innodb_lock_wait_timeout AS ilwt'))[0];
  await q('SET SESSION lock_wait_timeout = 10', null, Q.RAW); // falla rápido en vez de encolar (patrón 02a)
  await q('SET SESSION innodb_lock_wait_timeout = 10', null, Q.RAW);
  try {
    return await fn();
  } finally {
    await q('SET SESSION lock_wait_timeout = ' + Number(previo.lwt), null, Q.RAW);
    await q('SET SESSION innodb_lock_wait_timeout = ' + Number(previo.ilwt), null, Q.RAW);
  }
}

async function bloquear(q) {
  for (const tabla of ORDEN_LOCKS) await q('SELECT id FROM `' + tabla + '` ORDER BY id FOR UPDATE');
}

// UPDATE col = valor WHERE id IN (...) AND col IS NULL, por valor y en sublotes de 1000 ids ASC
async function vincular(q, tabla, columna, items, log) {
  const porValor = new Map();
  items.forEach(function (it) {
    const v = it.destino.id;
    if (!porValor.has(v)) porValor.set(v, []);
    porValor.get(v).push(it.id);
  });
  for (const par of porValor) {
    const ids = par[1].sort(function (a, b) { return a - b; });
    for (let i = 0; i < ids.length; i += SUBLOTE) {
      const lote = ids.slice(i, i + SUBLOTE);
      const r = await q('UPDATE `' + tabla + '` SET `' + columna + '` = :v WHERE id IN (:ids) AND `' + columna + '` IS NULL',
        { v: par[0], ids: lote }, Q.UPDATE);
      if (r[1] !== lote.length) {
        throw new Error('[RF-PEV-02b] ' + tabla + '.' + columna + ' cambió durante la migración (esperadas ' +
          lote.length + ', actualizadas ' + r[1] + '). Rollback completo.');
      }
      lote.forEach(function (id) { log.push([tabla, id, 'VINCULAR', par[0]]); });
    }
  }
}

async function auditarCorrida(q, accion, lote, despues) {
  await q(
    'INSERT INTO auditoria (usuario_id, contexto_usuario, entidad, entidad_id, accion, valores_antes, valores_despues, motivo, ip, created_at) ' +
      "VALUES (NULL, 'sistema', :entidad, :lote, :accion, NULL, :despues, :motivo, NULL, UTC_TIMESTAMP())",
    { entidad: LOG, lote: String(lote), accion: accion, despues: JSON.stringify(despues), motivo: 'RF-PEV-02b backfill M2' },
    Q.INSERT
  );
}

/**
 * Aplica el plan en una transacción global (D-119). Idempotente: una segunda corrida no agrega filas al log.
 * @param {object} sequelize
 * @returns {Promise<{lote: number, filas_log: number, resumen: object}>}
 */
async function aplicar(sequelize) {
  // DDL fuera de la transacción (MySQL hace autocommit), idempotente
  await sequelize.query(
    'CREATE TABLE IF NOT EXISTS `' + LOG + '` (' +
      '`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `lote` INT NOT NULL, `entidad` VARCHAR(40) NOT NULL, ' +
      '`entidad_id` INT NOT NULL, `accion` VARCHAR(10) NOT NULL, `valor_nuevo` INT NULL, `created_at` DATETIME NOT NULL, ' +
      'UNIQUE KEY `uq_pev_backfill_log_entidad` (`entidad`, `entidad_id`), KEY `idx_pev_backfill_log_valor` (`entidad`, `valor_nuevo`)' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
  return sequelize.transaction({ isolationLevel: READ_COMMITTED }, function (transaction) {
    const q = consulta(sequelize, transaction);
    return conTimeouts(q, async function () {
      await bloquear(q);
      const plan = await planificar(sequelize, { transaction: transaction });
      // lote = nº de corrida (con transacción global ya no es por cliente, D-119)
      const lote = Number((await q('SELECT COALESCE(MAX(lote), 0) + 1 AS n FROM `' + LOG + '`'))[0].n);
      const log = [];

      for (const a of plan.actividadesNuevas) {
        a.id = (await q(
          'INSERT INTO actividades (cliente_id, nombre, estado, origen, created_by, created_at, updated_at) ' +
            "VALUES (:c, :n, :e, 'BACKFILL', NULL, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
          { c: a.cliente_id, n: a.nombre, e: a.estado }, Q.INSERT))[0];
        log.push([E.act, a.id, 'CREAR', null]);
        for (const p of PASOS_DEFECTO) {
          const pid = (await q(
            'INSERT INTO actividad_pasos (actividad_id, orden, nombre, columna_legacy, estado) VALUES (:a, :o, :n, :c, 1)',
            { a: a.id, o: p.orden, n: p.nombre, c: p.columna_legacy }, Q.INSERT))[0];
          log.push([E.pasos, pid, 'CREAR', null]);
        }
      }
      await vincular(q, E.tareas, 'actividadId', plan.tareas, log);

      for (const s of plan.asignacionesNuevas) {
        s.id = (await q(
          'INSERT INTO actividad_asignaciones (actividad_id, area_id, trabajador_id, tarea_id, turno_id, fecha_desde, fecha_hasta, ' +
            'estado, activa_flag, origen, created_at, updated_at) VALUES (:act, :area, :trab, :tarea, :turno, :desde, :hasta, ' +
            ":estado, :flag, 'BACKFILL', UTC_TIMESTAMP(), UTC_TIMESTAMP())",
          { act: s.ref.id, area: s.area_id, trab: s.trabajador_id, tarea: s.tarea_id, turno: s.turno_id, desde: s.desde,
            hasta: s.hasta, estado: s.estado, flag: s.estado === 'ACTIVA' ? 1 : null }, Q.INSERT))[0];
        log.push([E.asig, s.id, 'CREAR', null]);
      }
      await vincular(q, E.lpev, 'asignacionId', plan.lpev, log);
      await vincular(q, E.lsup, 'asignacionId', plan.lsup, log);

      for (let i = 0; i < log.length; i += SUBLOTE) {
        const parte = log.slice(i, i + SUBLOTE);
        const valores = [];
        parte.forEach(function (f) { valores.push(lote, f[0], f[1], f[2], f[3]); });
        await q('INSERT INTO `' + LOG + '` (lote, entidad, entidad_id, accion, valor_nuevo, created_at) VALUES ' +
          parte.map(function () { return '(?, ?, ?, ?, ?, UTC_TIMESTAMP())'; }).join(', '), valores, Q.INSERT);
      }
      // Corrida sin cambios (re-ejecución) no deja auditoría: no hubo operación
      if (log.length) await auditarCorrida(q, 'MIGRACION', lote, { lote: lote, filas_log: log.length, resumen: plan.resumen });
      return { lote: lote, filas_log: log.length, resumen: plan.resumen };
    });
  });
}

// Guardia del down (§2.1-G): cada consulta cuenta filas que se perderían o se desenlazarían por error
const GUARDIA = [
  { motivo: 'TAREA_AJENA_EN_ACTIVIDAD_BACKFILL', sql: 'SELECT COUNT(*) AS n FROM tareas x JOIN `' + LOG + "` g ON g.entidad = 'actividades' AND g.accion = 'CREAR' AND g.entidad_id = x.actividadId LEFT JOIN `" + LOG + "` v ON v.entidad = 'tareas' AND v.entidad_id = x.id WHERE v.id IS NULL" },
  { motivo: 'ASIGNACION_AJENA_EN_ACTIVIDAD_BACKFILL', sql: 'SELECT COUNT(*) AS n FROM actividad_asignaciones x JOIN `' + LOG + "` g ON g.entidad = 'actividades' AND g.accion = 'CREAR' AND g.entidad_id = x.actividad_id LEFT JOIN `" + LOG + "` v ON v.entidad = 'actividad_asignaciones' AND v.entidad_id = x.id WHERE v.id IS NULL" },
  { motivo: 'PASO_AJENO_EN_ACTIVIDAD_BACKFILL', sql: 'SELECT COUNT(*) AS n FROM actividad_pasos x JOIN `' + LOG + "` g ON g.entidad = 'actividades' AND g.accion = 'CREAR' AND g.entidad_id = x.actividad_id LEFT JOIN `" + LOG + "` v ON v.entidad = 'actividad_pasos' AND v.entidad_id = x.id WHERE v.id IS NULL" },
  { motivo: 'LINEA_PEV_AJENA_EN_ASIGNACION_BACKFILL', sql: 'SELECT COUNT(*) AS n FROM linea_lista_pev_trabajadores x JOIN `' + LOG + "` g ON g.entidad = 'actividad_asignaciones' AND g.accion = 'CREAR' AND g.entidad_id = x.asignacionId LEFT JOIN `" + LOG + "` v ON v.entidad = 'linea_lista_pev_trabajadores' AND v.entidad_id = x.id WHERE v.id IS NULL" },
  { motivo: 'LINEA_SUPER_AJENA_EN_ASIGNACION_BACKFILL', sql: 'SELECT COUNT(*) AS n FROM linea_lista_super_trabajadores x JOIN `' + LOG + "` g ON g.entidad = 'actividad_asignaciones' AND g.accion = 'CREAR' AND g.entidad_id = x.asignacionId LEFT JOIN `" + LOG + "` v ON v.entidad = 'linea_lista_super_trabajadores' AND v.entidad_id = x.id WHERE v.id IS NULL" },
  { motivo: 'ASIGNACION_BACKFILL_MODIFICADA', sql: 'SELECT COUNT(*) AS n FROM actividad_asignaciones x JOIN `' + LOG + "` g ON g.entidad = 'actividad_asignaciones' AND g.accion = 'CREAR' AND g.entidad_id = x.id WHERE x.updated_at <> x.created_at OR x.cerrada_at IS NOT NULL OR x.cerrada_by IS NOT NULL OR x.motivo IS NOT NULL" },
  { motivo: 'ACTIVIDAD_BACKFILL_MODIFICADA', sql: 'SELECT COUNT(*) AS n FROM actividades x JOIN `' + LOG + "` g ON g.entidad = 'actividades' AND g.accion = 'CREAR' AND g.entidad_id = x.id WHERE x.updated_at <> x.created_at" },
  { motivo: 'VINCULO_TAREA_ALTERADO', sql: 'SELECT COUNT(*) AS n FROM tareas x JOIN `' + LOG + "` g ON g.entidad = 'tareas' AND g.accion = 'VINCULAR' AND g.entidad_id = x.id WHERE NOT (x.actividadId <=> g.valor_nuevo)" },
  { motivo: 'VINCULO_LINEA_PEV_ALTERADO', sql: 'SELECT COUNT(*) AS n FROM linea_lista_pev_trabajadores x JOIN `' + LOG + "` g ON g.entidad = 'linea_lista_pev_trabajadores' AND g.accion = 'VINCULAR' AND g.entidad_id = x.id WHERE NOT (x.asignacionId <=> g.valor_nuevo)" },
  { motivo: 'VINCULO_LINEA_SUPER_ALTERADO', sql: 'SELECT COUNT(*) AS n FROM linea_lista_super_trabajadores x JOIN `' + LOG + "` g ON g.entidad = 'linea_lista_super_trabajadores' AND g.accion = 'VINCULAR' AND g.entidad_id = x.id WHERE NOT (x.asignacionId <=> g.valor_nuevo)" }
];

/**
 * Revierte lo registrado en pev_backfill_log. Aborta sin cambios si hubo uso posterior (guardia).
 * @param {object} sequelize
 * @returns {Promise<{revertido: boolean, filas_log?: number, detalle?: object}>}
 */
async function revertir(sequelize) {
  if (!(await existeLog(consulta(sequelize)))) return { revertido: false };
  const r = await sequelize.transaction({ isolationLevel: READ_COMMITTED }, function (transaction) {
    const q = consulta(sequelize, transaction);
    return conTimeouts(q, async function () {
      await bloquear(q);
      const bloqueos = [];
      for (const g of GUARDIA) {
        const n = Number((await q(g.sql))[0].n);
        if (n > 0) bloqueos.push(g.motivo + '=' + n);
      }
      if (bloqueos.length) {
        throw new Error('[RF-PEV-02b] down abortado sin cambios: hubo uso posterior (' + bloqueos.join(', ') + '). ' +
          'Rollback principal = solo código (D-121); forzar el down sería destructivo y no está autorizado.');
      }
      const lote = Number((await q('SELECT COALESCE(MAX(lote), 0) AS n FROM `' + LOG + '`'))[0].n);
      const detalle = {};
      // Desenlazar: supervisor → PEV → tareas (solo donde sigue el valor escrito por M2)
      for (const v of [[E.lsup, 'asignacionId'], [E.lpev, 'asignacionId'], [E.tareas, 'actividadId']]) {
        detalle[v[0]] = (await q('UPDATE `' + v[0] + '` x JOIN `' + LOG + "` g ON g.entidad = :e AND g.accion = 'VINCULAR' " +
          'AND g.entidad_id = x.id SET x.`' + v[1] + '` = NULL WHERE x.`' + v[1] + '` = g.valor_nuevo', { e: v[0] }, Q.UPDATE))[1];
      }
      // Borrar solo filas creadas por M2: asignaciones → pasos → actividades
      for (const t of [E.asig, E.pasos, E.act]) {
        detalle['borradas_' + t] = await q('DELETE x FROM `' + t + '` x JOIN `' + LOG + "` g ON g.entidad = :e AND g.accion = 'CREAR' " +
          'AND g.entidad_id = x.id', { e: t }, Q.BULKDELETE);
      }
      const filas = Number((await q('SELECT COUNT(*) AS n FROM `' + LOG + '`'))[0].n);
      await q('DELETE FROM `' + LOG + '`', null, Q.BULKDELETE); // si el dropTable posterior falla, un nuevo down es no-op
      if (filas) await auditarCorrida(q, 'REVERSION_MIGRACION', lote, { filas_log: filas, detalle: detalle });
      return { revertido: true, filas_log: filas, detalle: detalle };
    });
  });
  await sequelize.getQueryInterface().dropTable(LOG);
  return r;
}

/**
 * Conteos de control K (§2.1-K, §2.2-C6). Solo lectura. K-3…K-6/K-10 se derivan de estos números,
 * del resumen de planificar() y del log.
 * @param {object} sequelize
 * @param {{transaction?: object}} [opciones]
 * @returns {Promise<object>}
 */
async function controles(sequelize, opciones) {
  const q = consulta(sequelize, (opciones || {}).transaction);
  const uno = async function (sql) { return (await q(sql))[0]; };
  const k = { k1: {}, k2: {} };
  for (const t of LEGACY_CONTEOS) k.k1[t] = Number((await uno('SELECT COUNT(*) AS n FROM `' + t + '`')).n);
  for (const t of Object.keys(COLS_K2)) {
    const cols = COLS_K2[t].map(function (c) { return 'COALESCE(`' + c + "`, '" + NULO + "')"; }).join(', ');
    const f = await uno("SELECT COUNT(*) AS n, CAST(SUM(CRC32(CONCAT_WS('|', " + cols + '))) AS CHAR) AS chk FROM `' + t + '`');
    k.k2[t] = Number(f.n) + ':' + f.chk;
  }
  k.no_nulos = {
    tareas_actividadId: Number((await uno('SELECT COUNT(*) AS n FROM tareas WHERE actividadId IS NOT NULL')).n),
    lpev_asignacionId: Number((await uno('SELECT COUNT(*) AS n FROM linea_lista_pev_trabajadores WHERE asignacionId IS NOT NULL')).n),
    lsup_asignacionId: Number((await uno('SELECT COUNT(*) AS n FROM linea_lista_super_trabajadores WHERE asignacionId IS NOT NULL')).n)
  };
  k.nuevas = {
    actividades: await q('SELECT origen, COUNT(*) AS n FROM actividades GROUP BY origen ORDER BY origen'),
    pasos: Number((await uno('SELECT COUNT(*) AS n FROM actividad_pasos')).n),
    asignaciones: await q('SELECT origen, estado, COUNT(*) AS n FROM actividad_asignaciones GROUP BY origen, estado ORDER BY origen, estado')
  };
  k.k6 = {
    lineas_en_backfill: Number((await uno("SELECT COUNT(*) AS n FROM linea_lista_pev_trabajadores l JOIN actividad_asignaciones aa ON aa.id = l.asignacionId WHERE aa.origen = 'BACKFILL'")).n),
    backfill_sin_lineas: Number((await uno("SELECT COUNT(*) AS n FROM actividad_asignaciones aa WHERE aa.origen = 'BACKFILL' AND NOT EXISTS (SELECT 1 FROM linea_lista_pev_trabajadores l WHERE l.asignacionId = aa.id)")).n)
  };
  // K-7: DATE() en SQL coincide con fechaLinea salvo 03:00 UTC en horario de invierno (-4)
  k.k7_violaciones = Number((await uno(
    'SELECT COUNT(*) AS n FROM linea_lista_pev_trabajadores l JOIN actividad_asignaciones aa ON aa.id = l.asignacionId ' +
      'LEFT JOIN tareas t ON t.id = l.tareaId LEFT JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
      'LEFT JOIN cronogramas c ON c.id = lp.cronogramaId LEFT JOIN trabajadores tr ON tr.id = aa.trabajador_id ' +
      'WHERE NOT (aa.actividad_id <=> t.actividadId) OR NOT (aa.area_id <=> t.areaId) OR NOT (tr.n_empleado <=> lp.n_empleado) ' +
      'OR NOT (aa.turno_id <=> c.turnoId) OR NOT (DATE(lp.fecha_chequeo) >= aa.fecha_desde) ' +
      'OR (aa.fecha_hasta IS NOT NULL AND NOT (DATE(lp.fecha_chequeo) <= aa.fecha_hasta))')).n);
  k.k8_super_distinta = Number((await uno(
    'SELECT COUNT(*) AS n FROM linea_lista_super_trabajadores ls JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ' +
      'JOIN linea_lista_pev_trabajadores l ON l.listasPevTrabajadoreId = st.listasPevTrabajadoreId AND l.tareaId = ls.tareaId ' +
      'WHERE ls.asignacionId IS NOT NULL AND NOT (l.asignacionId <=> ls.asignacionId)')).n);
  k.k9 = {
    activas_duplicadas: Number((await uno("SELECT COUNT(*) AS n FROM (SELECT 1 FROM actividad_asignaciones WHERE estado = 'ACTIVA' GROUP BY actividad_id, area_id, trabajador_id, COALESCE(turno_id, -1) HAVING COUNT(*) > 1) x")).n),
    flag_inconsistente: Number((await uno("SELECT COUNT(*) AS n FROM actividad_asignaciones WHERE (estado = 'ACTIVA') <> (activa_flag <=> 1)")).n)
  };
  // K-13/K-14: por trabajador y fecha_chequeo exacta (partición más fina que la fecha C1: igualdad aquí implica igualdad por día)
  const agregado = async function (desde, nEmpleado, suma, filtro) {
    const f = await uno(
      "SELECT COUNT(*) AS grupos, CAST(SUM(s) AS CHAR) AS total, CAST(SUM(CRC32(CONCAT_WS('|', n, f, s, o))) AS CHAR) AS chk FROM (" +
        'SELECT COALESCE(' + nEmpleado + ", '" + NULO + "') AS n, COALESCE(DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%d %H:%i:%s'), '" + NULO + "') AS f, " +
        'SUM(' + suma + ') AS s, COUNT(x.observaciones) AS o ' + desde + (filtro || '') + ' GROUP BY 1, 2) z');
    return f.grupos + ':' + f.total + ':' + f.chk;
  };
  const sumaPev = 'COALESCE(x.check_trabajador_1, 0) + COALESCE(x.check_trabajador_2, 0) + COALESCE(x.check_trabajador_3, 0)';
  const sumaSup = ['despolvado', 'aplicacion_producto', 'abrillantado'].map(function (c) {
    return [1, 2, 3].map(function (i) { return 'COALESCE(x.' + c + '_' + i + ', 0)'; }).join(' + ');
  }).join(' + ');
  const desdePev = ' FROM linea_lista_pev_trabajadores x JOIN listas_pev_trabajadores lp ON lp.id = x.listasPevTrabajadoreId';
  const desdeSup = ' FROM linea_lista_super_trabajadores x JOIN listas_super_trabajadores st ON st.id = x.listasSuperTrabajadoreId ' +
    'JOIN listas_pev_trabajadores lp ON lp.id = st.listasPevTrabajadoreId';
  const viaAsig = ' JOIN actividad_asignaciones aa ON aa.id = x.asignacionId JOIN trabajadores tr ON tr.id = aa.trabajador_id';
  k.k13 = {
    legacy: await agregado(desdePev, 'lp.n_empleado', sumaPev),
    legacy_enlazadas: await agregado(desdePev, 'lp.n_empleado', sumaPev, ' WHERE x.asignacionId IS NOT NULL'),
    ruta_asignacion: await agregado(desdePev + viaAsig, 'tr.n_empleado', sumaPev)
  };
  k.k14 = {
    legacy: await agregado(desdeSup, 'lp.n_empleado', sumaSup),
    legacy_enlazadas: await agregado(desdeSup, 'lp.n_empleado', sumaSup, ' WHERE x.asignacionId IS NOT NULL'),
    ruta_asignacion: await agregado(desdeSup + viaAsig, 'tr.n_empleado', sumaSup)
  };
  if (await existeLog(q)) k.k10_log = await q('SELECT entidad, accion, COUNT(*) AS n FROM `' + LOG + '` GROUP BY entidad, accion ORDER BY entidad, accion');
  return k;
}

module.exports = {
  planificar: planificar,
  aplicar: aplicar,
  revertir: revertir,
  controles: controles,
  fechaLinea: fechaLinea,
  LOG: LOG
};
