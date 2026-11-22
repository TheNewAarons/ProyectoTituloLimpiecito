/**
 * RF-BI-04 — Productividad PEV (solo lectura, D-BI-04-1..4). Lee las listas diarias legacy que PEV-02c sigue usando:
 * - Cumplimiento del trabajador = pasos marcados (check_trabajador_1..3) / (tareas × 3).
 * - Verificación del supervisor = rondas con hora registrada (hora_1..3) / (tareas × 3).
 * - Observaciones = tareas con observación (línea del trabajador o del supervisor); PEV no tiene estado abierta/cerrada.
 * Fecha de negocio de la lista con fechaLinea (D-117); se excluyen listas sin fecha y las de días futuros.
 */

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const financiero = require('./financiero');
const { ventanaUtc } = require('./bodega');
const { fechaLinea } = require('../pev/backfill');

const MESES_POR_DEFECTO = 3;
const PASOS = [1, 2, 3];

function consultar(sql, replacements) {
  return db.sequelize.query(sql, { replacements: replacements, type: db.sequelize.QueryTypes.SELECT });
}

const COLS_LISTA =
  "lp.id AS lista_id, lp.n_empleado AS n_empleado, DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fecha_utc, " +
  'HOUR(lp.fecha_chequeo) AS hora_utc, s.id AS sector_id, s.nombre AS sector, s.clienteId AS cliente_id, cl.representante AS cliente ';
const JOIN_SECTOR = 'LEFT JOIN sectores s ON s.id = lp.sectoreId LEFT JOIN clientes cl ON cl.id = s.clienteId ';

const SQL_PEV =
  'SELECT l.id, l.check_trabajador_1 AS c1, l.check_trabajador_2 AS c2, l.check_trabajador_3 AS c3, l.observaciones, ' +
  'aa.trabajador_id, (SELECT MIN(st.n_empleado) FROM listas_super_trabajadores st WHERE st.listasPevTrabajadoreId = lp.id) AS supervisor_n, ' +
  COLS_LISTA +
  'FROM linea_lista_pev_trabajadores l JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
  'LEFT JOIN actividad_asignaciones aa ON aa.id = l.asignacionId ' + JOIN_SECTOR +
  'WHERE lp.fecha_chequeo >= :ini AND lp.fecha_chequeo < :fin';

const SQL_SUPER =
  'SELECT ls.id, ls.hora_1 AS h1, ls.hora_2 AS h2, ls.hora_3 AS h3, ls.observaciones, st.n_empleado AS supervisor_n, ' +
  'st.id AS lista_super_id, st.estado AS lista_super_estado, ' + COLS_LISTA +
  'FROM linea_lista_super_trabajadores ls JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ' +
  'JOIN listas_pev_trabajadores lp ON lp.id = st.listasPevTrabajadoreId ' + JOIN_SECTOR +
  'WHERE lp.fecha_chequeo >= :ini AND lp.fecha_chequeo < :fin';

/** Filtros: desde/hasta 'YYYY-MM' (defecto últimos 3 meses), cliente_id y supervisor (n_empleado) opcionales. */
function filtros(q) {
  const h = q.hasta || financiero.mesActual();
  financiero.validarRango(h, h);
  const d = q.desde || financiero.indiceAPeriodo(financiero.periodoAIndice(h) - (MESES_POR_DEFECTO - 1));
  financiero.validarRango(d, h);
  const r = { desde: d, hasta: h, cliente_id: null, supervisor: null };
  ['cliente_id', 'supervisor'].forEach(function (k) {
    if (q[k] === undefined || q[k] === '') return;
    const n = Number(q[k]);
    if (!/^\d+$/.test(String(q[k])) || !Number.isSafeInteger(n) || n <= 0) {
      throw new AppError('CAMPO_INVALIDO', k + ' debe ser un entero mayor a 0', 400, { [k]: q[k] });
    }
    r[k] = n;
  });
  return r;
}

/** Deja solo las filas del período (mes en Santiago, hasta hoy) y de los filtros; agrega `fecha`. */
function delPeriodo(filas, r, hoy) {
  return filas.reduce(function (acc, f) {
    const dia = fechaLinea(f.fecha_utc, f.hora_utc === null || f.hora_utc === undefined ? null : Number(f.hora_utc));
    if (!dia || dia > hoy || dia.slice(0, 7) < r.desde || dia.slice(0, 7) > r.hasta) return acc;
    if (r.cliente_id && Number(f.cliente_id) !== r.cliente_id) return acc;
    if (r.supervisor && Number(f.supervisor_n) !== r.supervisor) return acc;
    acc.push(Object.assign({ fecha: dia }, f));
    return acc;
  }, []);
}

const pct = (a, b) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);
const conTexto = (v) => typeof v === 'string' && v.trim() !== '';
const nombreCompleto = (t) => ((t.nombre || '') + ' ' + (t.apellido || '')).trim();

/** Índices de trabajadores por id y por n_empleado (solo si el n_empleado es único). */
function indicePersonas(trabajadores) {
  const porId = {};
  const porN = {};
  const repetidos = {};
  trabajadores.forEach(function (t) {
    porId[t.id] = t;
    if (t.n_empleado === null || t.n_empleado === undefined) return;
    if (porN[t.n_empleado]) repetidos[t.n_empleado] = true;
    porN[t.n_empleado] = t;
  });
  Object.keys(repetidos).forEach(function (n) { delete porN[n]; });
  return { porId: porId, porN: porN };
}

/** D-BI-04-4: trabajador de la asignación; si no hay, el n_empleado de la lista cuando es único. */
function identificarTrabajador(f, personas) {
  const t = f.trabajador_id ? personas.porId[f.trabajador_id] : personas.porN[f.n_empleado];
  if (t) return { clave: 't' + t.id, trabajador_id: t.id, nombre: nombreCompleto(t) || 'Trabajador ' + t.id, n_empleado: t.n_empleado };
  return { clave: 'n' + f.n_empleado, trabajador_id: null, nombre: 'Sin identificar (N° ' + f.n_empleado + ')', n_empleado: f.n_empleado };
}

/** Cumplimiento por trabajador (puro). */
function armarTrabajadores(lineas, personas) {
  const m = {};
  lineas.forEach(function (f) {
    const id = identificarTrabajador(f, personas);
    const g = m[id.clave] || (m[id.clave] = { trabajador_id: id.trabajador_id, nombre: id.nombre, n_empleado: id.n_empleado, tareas: 0, pasos_marcados: 0, dias: {} });
    g.tareas += 1;
    g.pasos_marcados += PASOS.filter(function (n) { return Number(f['c' + n]) === 1; }).length;
    g.dias[f.fecha] = true;
  });
  return Object.keys(m).map(function (k) {
    const g = m[k];
    const asignados = g.tareas * PASOS.length;
    return { trabajador_id: g.trabajador_id, nombre: g.nombre, n_empleado: g.n_empleado, dias: Object.keys(g.dias).length, tareas: g.tareas,
      pasos_asignados: asignados, pasos_marcados: g.pasos_marcados, cumplimiento_pct: pct(g.pasos_marcados, asignados) };
  }).sort(function (a, b) { return a.cumplimiento_pct - b.cumplimiento_pct || b.tareas - a.tareas || a.nombre.localeCompare(b.nombre); });
}

/** Tasa de verificación por supervisor (puro), de mayor a menor. */
function armarSupervisores(lineas, personas) {
  const m = {};
  lineas.forEach(function (f) {
    const k = String(f.supervisor_n);
    const g = m[k] || (m[k] = { n_empleado: f.supervisor_n, tareas: 0, rondas_verificadas: 0, listas: {}, firmadas: {} });
    g.tareas += 1;
    g.rondas_verificadas += PASOS.filter(function (n) { return f['h' + n] !== null && f['h' + n] !== undefined; }).length;
    g.listas[f.lista_super_id] = true;
    if (Number(f.lista_super_estado) !== 1) g.firmadas[f.lista_super_id] = true; // mismo criterio que PEV-02c: 1 = abierta
  });
  return Object.keys(m).map(function (k) {
    const g = m[k];
    const t = personas.porN[g.n_empleado];
    const asignadas = g.tareas * PASOS.length;
    return { n_empleado: g.n_empleado, trabajador_id: t ? t.id : null, nombre: t ? nombreCompleto(t) : 'Sin identificar (N° ' + g.n_empleado + ')',
      listas: Object.keys(g.listas).length, listas_firmadas: Object.keys(g.firmadas).length, tareas: g.tareas,
      rondas_asignadas: asignadas, rondas_verificadas: g.rondas_verificadas, verificacion_pct: pct(g.rondas_verificadas, asignadas) };
  }).sort(function (a, b) { return b.verificacion_pct - a.verificacion_pct || b.tareas - a.tareas || a.nombre.localeCompare(b.nombre); })
    .map(function (f, i) { f.posicion = i + 1; return f; });
}

/** Por sector: tareas, cumplimiento y observaciones (trabajador + supervisor), más observaciones primero (puro). */
function armarSectores(lineasPev, lineasSuper) {
  const m = {};
  const grupo = function (f) {
    const k = String(f.sector_id);
    return m[k] || (m[k] = { sector_id: f.sector_id, sector: f.sector_id === null || f.sector_id === undefined ? 'Sin sector' : f.sector || 'Sector ' + f.sector_id, cliente_id: f.cliente_id, cliente: f.cliente || null,
      tareas: 0, pasos_marcados: 0, observaciones_trabajador: 0, observaciones_supervisor: 0 });
  };
  lineasPev.forEach(function (f) {
    const g = grupo(f);
    g.tareas += 1;
    g.pasos_marcados += PASOS.filter(function (n) { return Number(f['c' + n]) === 1; }).length;
    if (conTexto(f.observaciones)) g.observaciones_trabajador += 1;
  });
  lineasSuper.forEach(function (f) { if (conTexto(f.observaciones)) grupo(f).observaciones_supervisor += 1; });
  return Object.keys(m).map(function (k) {
    const g = m[k];
    return { sector_id: g.sector_id, sector: g.sector, cliente_id: g.cliente_id, cliente: g.cliente, tareas: g.tareas,
      cumplimiento_pct: pct(g.pasos_marcados, g.tareas * PASOS.length), observaciones: g.observaciones_trabajador + g.observaciones_supervisor,
      observaciones_trabajador: g.observaciones_trabajador, observaciones_supervisor: g.observaciones_supervisor };
  }).sort(function (a, b) { return b.observaciones - a.observaciones || a.sector.localeCompare(b.sector); });
}

const suma = (xs, k) => xs.reduce(function (a, x) { return a + x[k]; }, 0);

async function cargar(q, conPev, conSuper) {
  const r = filtros(q);
  const v = ventanaUtc(r);
  const [pev, sup, trabajadores] = await Promise.all([
    conPev ? consultar(SQL_PEV, v) : [],
    conSuper ? consultar(SQL_SUPER, v) : [],
    consultar('SELECT id, nombre, apellido, n_empleado FROM trabajadores', {})
  ]);
  const hoy = fecha.hoySantiago();
  return { r: r, pev: delPeriodo(pev, r, hoy), sup: delPeriodo(sup, r, hoy), personas: indicePersonas(trabajadores) };
}

const metaBase = (r) => ({ desde: r.desde, hasta: r.hasta, cliente_id: r.cliente_id, supervisor: r.supervisor });

async function trabajadores(q) {
  const c = await cargar(q, true, false);
  const data = armarTrabajadores(c.pev, c.personas);
  return { data: data, meta: Object.assign(metaBase(c.r), { tareas: suma(data, 'tareas'), cumplimiento_pct: pct(suma(data, 'pasos_marcados'), suma(data, 'pasos_asignados')) }) };
}

async function supervisores(q) {
  const c = await cargar(q, false, true);
  const data = armarSupervisores(c.sup, c.personas);
  return { data: data, meta: Object.assign(metaBase(c.r), { tareas: suma(data, 'tareas'), verificacion_pct: pct(suma(data, 'rondas_verificadas'), suma(data, 'rondas_asignadas')) }) };
}

async function sectores(q) {
  const c = await cargar(q, true, true);
  const data = armarSectores(c.pev, c.sup);
  return { data: data, meta: Object.assign(metaBase(c.r), { observaciones: suma(data, 'observaciones') }) };
}

module.exports = {
  filtros: filtros, delPeriodo: delPeriodo, indicePersonas: indicePersonas, armarTrabajadores: armarTrabajadores,
  armarSupervisores: armarSupervisores, armarSectores: armarSectores, trabajadores: trabajadores, supervisores: supervisores, sectores: sectores
};
