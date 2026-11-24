/**
 * RF-PEV-02 (AUT-016, obs. 12 de las pruebas web) — Reflejar una asignación de actividad en el Cronograma.
 *
 * Al crear una asignación (actividad, área → tarea puente, trabajador, turno, desde), en la MISMA transacción:
 *   1. se buscan los cronogramas ACTIVOS (estado 1) del cliente y turno cuyo mes es >= el mes de inicio;
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
const periodo = (fechaYmd) => {
  const [a, m] = String(fechaYmd).split('-').map(Number);
  return { anio: a, mes: m };
};

/**
 * Cronogramas activos del cliente y turno desde el mes de `fechaDesde` (inclusive), ordenados por período.
 * Con `t` los bloquea FOR UPDATE (evita duplicar líneas/trabajadores con asignaciones concurrentes).
 */
async function cronogramasDestino(clienteId, turnoId, fechaDesde, t) {
  const p = periodo(fechaDesde);
  const filas = await db.sequelize.query(
    'SELECT id, mes, anio FROM cronogramas WHERE clienteId = :cliente AND turnoId = :turno AND estado = :activo ' +
    'AND (anio > :anio OR (anio = :anio AND mes >= :mes)) ORDER BY anio, mes, id' + (t ? ' FOR UPDATE' : ''),
    { replacements: { cliente: clienteId, turno: turnoId, activo: CRONOGRAMA_ACTIVO, anio: p.anio, mes: p.mes },
      type: Sequelize.QueryTypes.SELECT, transaction: t || undefined }
  );
  return conId(filas).map((f) => ({ id: Number(f.id), mes: Number(f.mes), anio: Number(f.anio) }));
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
 * @returns {Promise<{cronogramas:Array<{id,mes,anio,tarea_agregada:boolean,trabajador_asociado:boolean}>}>}
 */
async function sincronizar(t, d, contexto) {
  const destino = await cronogramasDestino(d.clienteId, d.turnoId, d.fechaDesde, t);
  const resultado = [];
  for (const c of destino) {
    const tareaAgregada = !(await existe('linea_cronogramas', 'tareaId', c.id, d.tareaId, t));
    if (tareaAgregada) {
      const idLinea = await insertar('linea_cronogramas', 'tareaId', c.id, d.tareaId, t);
      await auditar({ transaction: t, usuario: contexto.usuario, entidad: 'linea_cronogramas', entidad_id: idLinea || c.id,
        accion: 'CREAR', antes: null, despues: { cronogramaId: c.id, tareaId: d.tareaId, origen: 'asignacion' }, ip: contexto.ip });
    }
    const trabajadorAsociado = !(await existe('trabajadores_cronogramas', 'trabajadoreId', c.id, d.trabajadorId, t));
    if (trabajadorAsociado) {
      const idAsoc = await insertar('trabajadores_cronogramas', 'trabajadoreId', c.id, d.trabajadorId, t);
      await auditar({ transaction: t, usuario: contexto.usuario, entidad: 'trabajadores_cronogramas', entidad_id: idAsoc || c.id,
        accion: 'CREAR', antes: null, despues: { cronogramaId: c.id, trabajadoreId: d.trabajadorId, origen: 'asignacion' }, ip: contexto.ip });
    }
    resultado.push({ id: c.id, mes: c.mes, anio: c.anio, tarea_agregada: tareaAgregada, trabajador_asociado: trabajadorAsociado });
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

module.exports = { sincronizar, destinoVistaPrevia, cronogramasDestino, CRONOGRAMA_ACTIVO };
