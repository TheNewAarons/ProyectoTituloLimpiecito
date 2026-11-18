'use strict';

/**
 * RF-PEV-02b (B2) — Dual-write: resuelve el `asignacionId` de una línea legacy nueva con la MISMA regla que M2
 * (services/pev/backfill.js, TASK_PLAN §2.1-B y §2.2-C1…C4): tarea.actividadId + tarea.areaId + el único
 * trabajador con ese n_empleado + turno del cronograma (<=>) + fecha D-117 dentro de la vigencia; cliente del
 * cronograma/turno = cliente de la tarea (C3); APP gana. Ante cualquier duda devuelve null y NUNCA lanza:
 * el legacy sigue igual y la línea queda NULL, como hoy (D-121, D-126).
 */

const Sequelize = require('sequelize');
const db = require('../../database/database');
const { fechaLinea } = require('./backfill');

const Q = Sequelize.QueryTypes;

const SQL_CANDIDATAS =
  'SELECT aa.id, aa.origen FROM tareas t ' +
  'JOIN areas a ON a.id = t.areaId JOIN sectores s ON s.id = a.sectoreId ' +
  'JOIN cronogramas c ON c.id = :cronogramaId LEFT JOIN turnos tu ON tu.id = c.turnoId ' +
  'JOIN actividad_asignaciones aa ON aa.actividad_id = t.actividadId AND aa.area_id = t.areaId ' +
  'AND aa.trabajador_id = :trabajadorId AND aa.turno_id <=> c.turnoId ' +
  'WHERE t.id = :tareaId AND c.clienteId = s.clienteId AND (c.turnoId IS NULL OR tu.clienteId = s.clienteId) ' +
  "AND aa.estado <> 'ANULADA' AND aa.fecha_desde <= :fecha AND (aa.fecha_hasta IS NULL OR aa.fecha_hasta >= :fecha) " +
  'ORDER BY aa.id';

// Revalidación con lock compartido dentro de la tx legacy: serializa con anular/cerrar (FOR UPDATE)
const SQL_VIGENTE =
  "SELECT id FROM actividad_asignaciones WHERE id = :id AND estado <> 'ANULADA' " +
  'AND fecha_desde <= :fecha AND (fecha_hasta IS NULL OR fecha_hasta >= :fecha) LOCK IN SHARE MODE';

function consultar(sql, replacements, transaction) {
  return db.sequelize.query(sql, { replacements: replacements, type: Q.SELECT, transaction: transaction });
}

// Solo motivo e ids técnicos: nunca n_empleado ni datos del trabajador
function avisar(motivo, tareaId, error) {
  console.warn('[pev] resolverAsignacion ' + motivo + ' tareaId=' + tareaId +
    (error ? ' error=' + (error.name || 'Error') + (error.original && error.original.code ? '/' + error.original.code : '') : ''));
}

/**
 * Fecha de negocio (D-117) de un `fecha_chequeo` (Date de Sequelize o string del body), vía backfill.fechaLinea.
 * @param {Date|string|null} valor
 * @returns {string|null} 'YYYY-MM-DD'
 */
function fechaDeNegocio(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return null;
  return fechaLinea(d.toISOString().slice(0, 19) + 'Z', d.getUTCHours());
}

/**
 * @param {{tareaId: number, n_empleado?: number, cronogramaId?: number, fecha_chequeo?: (Date|string),
 *          listaPevId?: number}} p  con `listaPevId` se leen n_empleado/cronogramaId/fecha_chequeo de esa lista
 * @param {{transaction?: object}} [opciones]  con transaction, el id elegido se revalida con LOCK IN SHARE MODE
 * @returns {Promise<number|null>} id de la asignación vigente o null
 */
async function resolverAsignacion(p, opciones) {
  const t = (opciones || {}).transaction;
  const tareaId = p && p.tareaId;
  try {
    let d = p || {};
    if (d.listaPevId) {
      d = (await consultar('SELECT n_empleado, cronogramaId, fecha_chequeo FROM listas_pev_trabajadores WHERE id = :id',
        { id: d.listaPevId }, t))[0];
      if (!d) return null;
    }
    const fecha = fechaDeNegocio(d.fecha_chequeo);
    if (!tareaId || d.n_empleado === null || d.n_empleado === undefined || !d.cronogramaId || !fecha) return null;

    const trabajadores = await consultar('SELECT id FROM trabajadores WHERE n_empleado = :n LIMIT 2', { n: d.n_empleado }, t);
    if (trabajadores.length !== 1) {
      if (trabajadores.length > 1) avisar('N_EMPLEADO_AMBIGUO', tareaId);
      return null;
    }

    const filas = await consultar(SQL_CANDIDATAS,
      { cronogramaId: d.cronogramaId, trabajadorId: trabajadores[0].id, tareaId: tareaId, fecha: fecha }, t);
    const app = filas.filter(function (f) { return f.origen === 'APP'; });
    const elegidas = app.length ? app : filas;
    if (elegidas.length > 1) { avisar('ASIGNACION_AMBIGUA', tareaId); return null; }
    const id = elegidas.length ? elegidas[0].id : null;
    if (id === null || !t) return id;
    // Sin esto, una anulación/cierre que confirma entre la lectura y el INSERT deja historial en una asignación no vigente
    const vigente = await consultar(SQL_VIGENTE, { id: id, fecha: fecha }, t);
    return vigente.length ? id : null;
  } catch (error) {
    avisar('ERROR', tareaId, error);
    return null;
  }
}

/**
 * Línea de supervisor (tabla B): copia el asignacionId de la línea PEV de su lista PEV con el mismo tareaId.
 * Sin valor o con más de un valor distinto → null. Nunca lanza.
 * @param {{tareaId: number, listaPevId?: number, listaSuperId?: number}} p  una de las dos listas
 * @param {{transaction?: object}} [opciones]
 * @returns {Promise<number|null>}
 */
async function asignacionDeLineaPev(p, opciones) {
  const tareaId = p && p.tareaId;
  try {
    if (!tareaId || !(p.listaPevId || p.listaSuperId)) return null;
    const desde = p.listaPevId
      ? 'linea_lista_pev_trabajadores l WHERE l.listasPevTrabajadoreId = :id'
      : 'listas_super_trabajadores st JOIN linea_lista_pev_trabajadores l ' +
        'ON l.listasPevTrabajadoreId = st.listasPevTrabajadoreId WHERE st.id = :id';
    const filas = await consultar('SELECT DISTINCT l.asignacionId FROM ' + desde +
      ' AND l.tareaId = :tareaId AND l.asignacionId IS NOT NULL LIMIT 2',
      { id: p.listaPevId || p.listaSuperId, tareaId: tareaId }, (opciones || {}).transaction);
    if (filas.length > 1) { avisar('ASIGNACION_AMBIGUA_SUPERVISOR', tareaId); return null; }
    return filas.length ? filas[0].asignacionId : null;
  } catch (error) {
    avisar('ERROR_SUPERVISOR', tareaId, error);
    return null;
  }
}

module.exports = {
  resolverAsignacion: resolverAsignacion,
  asignacionDeLineaPev: asignacionDeLineaPev,
  fechaDeNegocio: fechaDeNegocio
};
