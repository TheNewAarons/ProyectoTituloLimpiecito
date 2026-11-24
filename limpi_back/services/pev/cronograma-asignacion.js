/**
 * RF-PEV-02 (AUT-016, obs. 12 de las pruebas web) — Reflejar una asignación de actividad en el Cronograma.
 *
 * Al crear una asignación (actividad, área → tarea puente, trabajador, turno, desde), en la MISMA transacción:
 *   1. se buscan los cronogramas ACTIVOS (estado 1) del cliente y turno vigentes desde la fecha de inicio (por fechas);
 *   2. en cada uno se agrega la tarea puente (linea_cronogramas) si no está;
 *   3. se asocia el trabajador al cronograma (trabajadores_cronogramas) si no lo está.
 * No crea cronogramas ni días programados (checkeos): eso lo hace el administrador en la grilla (decisión 24-11).
 * No propaga la tarea a listas PEV ya generadas de otros trabajadores (a diferencia de crear-linea-cronograma legacy).
 * Al CERRAR una asignación no se quita nada del cronograma (historial).
 *
 * Usa SQL directo (sin modelos) para no exigir modelos nuevos a quien ya llama crearEnTx; ignora filas sin id
 * numérico (los tests existentes simulan `query` con filas genéricas).
 */
const Sequelize = require('sequelize');
const db = require('../../database/database');
// Carga diferida: la auditoría (y su modelo) solo se necesita al escribir, no en la vista previa.
const auditar = (p) => require('../auditoria').auditar(p);

const CRONOGRAMA_ACTIVO = 1;

const conId = (filas) => (Array.isArray(filas) ? filas : []).filter((f) => f && Number.isSafeInteger(Number(f.id)) && Number(f.id) > 0);

/**
 * Cronogramas activos del cliente y turno que siguen vigentes en `fechaDesde` o después (fecha_termino >= fechaDesde),
 * ordenados por inicio. Se usan las FECHAS y no mes/anio: la pantalla guarda `mes` base 0 (Enero = 0) y hay datos con
 * otra convención; las fechas son la referencia confiable. Con `t` los bloquea FOR UPDATE.
 */
async function cronogramasDestino(clienteId, turnoId, fechaDesde, t) {
  const filas = await db.sequelize.query(
    "SELECT id, DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS inicio, DATE_FORMAT(fecha_termino, '%Y-%m-%d') AS fin FROM cronogramas " +
    'WHERE clienteId = :cliente AND turnoId = :turno AND estado = :activo AND DATE(fecha_termino) >= :desde ' +
    'ORDER BY fecha_inicio, id' + (t ? ' FOR UPDATE' : ''),
    { replacements: { cliente: clienteId, turno: turnoId, activo: CRONOGRAMA_ACTIVO, desde: fechaDesde },
      type: Sequelize.QueryTypes.SELECT, transaction: t || undefined }
  );
  return conId(filas).map((f) => ({ id: Number(f.id), inicio: f.inicio, fin: f.fin }));
}

async function existe(tabla, columna, cronogramaId, valor, t) {
  const filas = await db.sequelize.query(
    'SELECT id FROM ' + tabla + ' WHERE cronogramaId = :c AND ' + columna + ' = :v LIMIT 1',
    { replacements: { c: cronogramaId, v: valor }, type: Sequelize.QueryTypes.SELECT, transaction: t }
  );
  return conId(filas).length > 0;
}

async function insertar(tabla, columna, cronogramaId, valor, t) {
  const r = await db.sequelize.query(
    'INSERT INTO ' + tabla + ' (cronogramaId, ' + columna + ') VALUES (:c, :v)',
    { replacements: { c: cronogramaId, v: valor }, type: Sequelize.QueryTypes.INSERT, transaction: t }
  );
  return Array.isArray(r) ? r[0] : r;
}

/**
 * @param {object} t transacción activa (la de crearEnTx)
 * @param {{clienteId:number, turnoId:number, fechaDesde:string, tareaId:number, trabajadorId:number}} d
 * @param {{usuario:object, ip?:string}} contexto
 * @returns {Promise<{cronogramas:Array<{id,inicio,fin,tarea_agregada:boolean,trabajador_asociado:boolean}>}>}
 */
async function sincronizar(t, d, contexto) {
  const destino = await cronogramasDestino(d.clienteId, d.turnoId, d.fechaDesde, t);
  const resultado = [];
  for (const c of destino) {
    const tareaAgregada = !(await existe('linea_cronogramas', 'tareaId', c.id, d.tareaId, t));
    if (tareaAgregada) {
      const idLinea = await insertar('linea_cronogramas', 'tareaId', c.id, d.tareaId, t);
      await auditar({ transaction: t, usuario: contexto.usuario, entidad: 'linea_cronogramas', entidad_id: idLinea != null ? idLinea : null,
        accion: 'CREAR', antes: null, despues: { cronogramaId: c.id, tareaId: d.tareaId, origen: 'asignacion' }, ip: contexto.ip });
    }
    const trabajadorAsociado = !(await existe('trabajadores_cronogramas', 'trabajadoreId', c.id, d.trabajadorId, t));
    if (trabajadorAsociado) {
      const idAsoc = await insertar('trabajadores_cronogramas', 'trabajadoreId', c.id, d.trabajadorId, t);
      await auditar({ transaction: t, usuario: contexto.usuario, entidad: 'trabajadores_cronogramas', entidad_id: idAsoc != null ? idAsoc : null,
        accion: 'CREAR', antes: null, despues: { cronogramaId: c.id, trabajadoreId: d.trabajadorId, origen: 'asignacion' }, ip: contexto.ip });
    }
    resultado.push({ id: c.id, inicio: c.inicio, fin: c.fin, tarea_agregada: tareaAgregada, trabajador_asociado: trabajadorAsociado });
  }
  return { cronogramas: resultado };
}

/**
 * Para la vista previa (sin transacción, sin escribir): a qué cronogramas llegaría la asignación.
 * Es informativo: si la consulta falla, la vista previa sigue (sin_cronograma: null = no se pudo verificar).
 */
async function destinoVistaPrevia(clienteId, turnoId, fechaDesde) {
  try {
    const c = await cronogramasDestino(clienteId, turnoId, fechaDesde, null);
    return { cronogramas: c, sin_cronograma: c.length === 0 };
  } catch (e) {
    return { cronogramas: [], sin_cronograma: null };
  }
}

/**
 * Panel "Asignaciones" de Ver Cronograma: asignaciones (no anuladas) del cliente y turno del cronograma cuya vigencia
 * toca el período del cronograma (fecha_inicio..fecha_termino). Devuelve null si el cronograma no existe.
 */
async function listarPorCronograma(cronogramaId) {
  const cr = conId(await db.sequelize.query("SELECT id, clienteId, turnoId, mes, anio, DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS inicio, " +
    "DATE_FORMAT(fecha_termino, '%Y-%m-%d') AS fin FROM cronogramas WHERE id = :id",
    { replacements: { id: cronogramaId }, type: Sequelize.QueryTypes.SELECT }))[0];
  if (!cr) return null;
  // Período real del cronograma por sus fechas (no por mes/anio: convención base 0 en pantalla, base 1 en datos antiguos).
  const inicio = cr.inicio < cr.fin ? cr.inicio : cr.fin;
  const fin = cr.inicio < cr.fin ? cr.fin : cr.inicio;
  const filas = await db.sequelize.query(
    'SELECT x.id, x.estado, x.fecha_desde, x.fecha_hasta, act.id AS actividad_id, act.nombre AS actividad, ' +
    'ar.nombre AS area, s.nombre AS sector, tr.id AS trabajador_id, tr.nombre AS trabajador_nombre, tr.apellido AS trabajador_apellido, ' +
    'tr.n_empleado FROM actividad_asignaciones x ' +
    'JOIN actividades act ON act.id = x.actividad_id JOIN areas ar ON ar.id = x.area_id JOIN sectores s ON s.id = ar.sectoreId ' +
    'JOIN trabajadores tr ON tr.id = x.trabajador_id ' +
    "WHERE act.cliente_id = :cliente AND x.turno_id = :turno AND x.estado <> 'ANULADA' " +
    'AND x.fecha_desde <= :fin AND (x.fecha_hasta IS NULL OR x.fecha_hasta >= :inicio) ' +
    // obs. 21: solo trabajadores asociados a ESTE cronograma (no asignaciones antiguas del cliente/turno ajenas a él).
    'AND EXISTS (SELECT 1 FROM trabajadores_cronogramas tc WHERE tc.cronogramaId = :cronograma AND tc.trabajadoreId = x.trabajador_id) ' +
    'ORDER BY act.nombre, s.nombre, ar.nombre, tr.apellido, tr.nombre',
    { replacements: { cronograma: Number(cr.id), cliente: cr.clienteId, turno: cr.turnoId, inicio: inicio, fin: fin }, type: Sequelize.QueryTypes.SELECT }
  );
  return {
    cronograma: { id: Number(cr.id), inicio: inicio, fin: fin, mes: Number(cr.mes), anio: Number(cr.anio), cliente_id: Number(cr.clienteId), turno_id: Number(cr.turnoId) },
    asignaciones: conId(filas).map((f) => ({
      id: Number(f.id), estado: f.estado, fecha_desde: f.fecha_desde, fecha_hasta: f.fecha_hasta,
      actividad_id: Number(f.actividad_id), actividad: f.actividad, sector: f.sector, area: f.area,
      trabajador_id: Number(f.trabajador_id), trabajador: [f.trabajador_nombre, f.trabajador_apellido].filter(Boolean).join(' '), n_empleado: f.n_empleado
    }))
  };
}

module.exports = { sincronizar, destinoVistaPrevia, cronogramasDestino, listarPorCronograma, CRONOGRAMA_ACTIVO };
