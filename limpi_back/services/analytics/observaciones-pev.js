/**
 * Retroalimentación de la revisión — Productividad PEV: el dashboard solo contaba las observaciones por sector; esto
 * devuelve el TEXTO de cada una (solo lectura). Mismas fuentes, filtros y período que services/analytics/productividad.js
 * (sectores): línea del trabajador (linea_lista_pev_trabajadores) y línea del supervisor (linea_lista_super_trabajadores).
 */
const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { ventanaUtc } = require('./bodega');
const { filtros, delPeriodo, indicePersonas } = require('./productividad');

const COLS_LISTA =
  "lp.id AS lista_id, lp.n_empleado AS n_empleado, DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fecha_utc, " +
  'HOUR(lp.fecha_chequeo) AS hora_utc, s.id AS sector_id, s.nombre AS sector, s.clienteId AS cliente_id, cl.representante AS cliente, ' +
  'ta.nombre AS tarea, ar.nombre AS area ';
const JOINS =
  'LEFT JOIN sectores s ON s.id = lp.sectoreId LEFT JOIN clientes cl ON cl.id = s.clienteId ' +
  'LEFT JOIN areas ar ON ar.id = ta.areaId ';
const CON_TEXTO = "TRIM(COALESCE(%s.observaciones, '')) <> ''";

const SQL_TRABAJADOR =
  'SELECT l.id, l.observaciones, aa.trabajador_id, ' +
  '(SELECT MIN(st.n_empleado) FROM listas_super_trabajadores st WHERE st.listasPevTrabajadoreId = lp.id) AS supervisor_n, ' + COLS_LISTA +
  'FROM linea_lista_pev_trabajadores l JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
  'LEFT JOIN actividad_asignaciones aa ON aa.id = l.asignacionId LEFT JOIN tareas ta ON ta.id = l.tareaId ' + JOINS +
  'WHERE lp.fecha_chequeo >= :ini AND lp.fecha_chequeo < :fin AND lp.sectoreId = :sector AND ' + CON_TEXTO.replace('%s', 'l');

const SQL_SUPERVISOR =
  'SELECT ls.id, ls.observaciones, st.n_empleado AS supervisor_n, ' + COLS_LISTA +
  'FROM linea_lista_super_trabajadores ls JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ' +
  'JOIN listas_pev_trabajadores lp ON lp.id = st.listasPevTrabajadoreId LEFT JOIN tareas ta ON ta.id = ls.tareaId ' + JOINS +
  'WHERE lp.fecha_chequeo >= :ini AND lp.fecha_chequeo < :fin AND lp.sectoreId = :sector AND ' + CON_TEXTO.replace('%s', 'ls');

const consultar = (sql, r) => db.sequelize.query(sql, { replacements: r, type: db.sequelize.QueryTypes.SELECT });
const nombre = (t) => ((t.nombre || '') + ' ' + (t.apellido || '')).trim();

function sectorDe(q) {
  const v = q.sector_id;
  const n = Number(v);
  if (v === undefined || v === '' || !/^\d+$/.test(String(v)) || !Number.isSafeInteger(n) || n <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'sector_id es obligatorio y debe ser un entero mayor a 0', 400, { sector_id: v === undefined ? null : v });
  }
  return n;
}

/** Arma las filas a mostrar (puro): quién escribió, dónde y el texto; más recientes primero. */
function armar(trabajador, supervisor, personas) {
  const autorTrabajador = (f) => {
    const t = f.trabajador_id ? personas.porId[f.trabajador_id] : personas.porN[f.n_empleado];
    return t ? nombre(t) || 'Trabajador ' + t.id : 'Sin identificar (N° ' + f.n_empleado + ')';
  };
  const autorSupervisor = (f) => {
    const t = personas.porN[f.supervisor_n];
    return t ? nombre(t) || 'Supervisor ' + t.id : 'Supervisor N° ' + f.supervisor_n;
  };
  const fila = (f, origen, autor) => ({
    fecha: f.fecha, origen: origen, autor: autor, area: f.area || null, tarea: f.tarea || null,
    texto: String(f.observaciones).trim(), lista_id: Number(f.lista_id)
  });
  return trabajador.map((f) => fila(f, 'TRABAJADOR', autorTrabajador(f)))
    .concat(supervisor.map((f) => fila(f, 'SUPERVISOR', autorSupervisor(f))))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.origen.localeCompare(b.origen)));
}

/** GET /api/v1/analytics/productividad/observaciones?sector_id=&desde=&hasta=&cliente_id=&supervisor= */
async function listar(q) {
  const sector = sectorDe(q || {});
  const r = filtros(q || {});
  const v = Object.assign({ sector: sector }, ventanaUtc(r));
  const [trab, sup, personas] = await Promise.all([
    consultar(SQL_TRABAJADOR, v),
    consultar(SQL_SUPERVISOR, v),
    consultar('SELECT id, nombre, apellido, n_empleado FROM trabajadores', {})
  ]);
  const hoy = fecha.hoySantiago();
  const data = armar(delPeriodo(trab, r, hoy), delPeriodo(sup, r, hoy), indicePersonas(personas));
  return { data: data, meta: { desde: r.desde, hasta: r.hasta, cliente_id: r.cliente_id, supervisor: r.supervisor, sector_id: sector, total: data.length } };
}

module.exports = { listar: listar, armar: armar };
