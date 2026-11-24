/**
 * RF-PEV-01 — Asignación masiva: una actividad (existente o nueva) a N trabajadores, cada uno con su área, en una sola
 * transacción (todo o nada). Spec §9 + Jira; decisiones D-PEV-01-1..4 (por cliente, un área por trabajador, tope 500).
 *
 * La vista previa reproduce en solo lectura las validaciones de services/pev/asignaciones.js#crear para que el resultado
 * sea el mismo que asignando uno a uno. La ejecución usa las funciones de Aarón con transacción externa (AUT-008),
 * inyectadas en `deps` para poder probar este servicio sin ellas.
 */

const Sequelize = require('sequelize');
const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { reintentarTransaccion } = require('../caja/cierre');
const Actividad = require('../../modelos/apartado_listas_pev/actividad');
const ActividadAsignacion = require('../../modelos/apartado_listas_pev/actividadAsignacion');
const Area = require('../../modelos/apartado_listas_pev/area');
const Sector = require('../../modelos/apartado_listas_pev/sector');
const Turno = require('../../modelos/apartado_listas_pev/turno');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');

const TOPE = 500;
const ACTIVO = 1;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;
// Resultado de cada fila. CREAR se crea; YA_ASIGNADA se omite (no se duplican idénticas); el resto bloquea la operación.
const RESULTADOS = {
  CREAR: 'CREAR',
  YA_ASIGNADA: 'YA_ASIGNADA',
  VIGENCIA_SOLAPADA: 'VIGENCIA_SOLAPADA',
  AREA_NO_EXISTE: 'AREA_NO_EXISTE',
  AREA_CLIENTE_DISTINTO: 'AREA_CLIENTE_DISTINTO',
  TRABAJADOR_NO_EXISTE: 'TRABAJADOR_NO_EXISTE'
};
const OMITIBLES = [RESULTADOS.YA_ASIGNADA];

const entero = (v) => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v.trim()))) && Number.isInteger(Number(v)) && Number(v) >= 1;
const plano = (x) => (x && x.get ? x.get({ plain: true }) : x);

/**
 * Valida y normaliza el cuerpo. Filas idénticas (mismo trabajador y área) se unen y se informan en `repetidas`.
 * @param {object} body { cliente_id, turno_id, fecha_desde?, actividad_id? | actividad_nombre?, filas: [{trabajador_id, area_id}] }
 */
function normalizar(body) {
  const b = body || {};
  const errores = {};
  if (!entero(b.cliente_id)) errores.cliente_id = 'cliente_id debe ser un entero mayor que 0';
  if (!entero(b.turno_id)) errores.turno_id = 'turno_id debe ser un entero mayor que 0';

  const nombre = typeof b.actividad_nombre === 'string' ? b.actividad_nombre.trim() : '';
  const tieneId = b.actividad_id !== undefined && b.actividad_id !== null && b.actividad_id !== '';
  if (tieneId === !!nombre) errores.actividad = 'indique actividad_id (existente) o actividad_nombre (nueva), uno solo';
  else if (tieneId && !entero(b.actividad_id)) errores.actividad = 'actividad_id debe ser un entero mayor que 0';
  // Mismo largo que actividades.crear (LARGO_NOMBRE, columna STRING(100)).
  else if (nombre && nombre.length > 100) errores.actividad = 'actividad_nombre supera 100 caracteres';

  let fechaDesde = null;
  if (b.fecha_desde !== undefined && b.fecha_desde !== null && b.fecha_desde !== '') {
    if (typeof b.fecha_desde !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.fecha_desde) || isNaN(new Date(b.fecha_desde + 'T00:00:00Z').getTime())) {
      errores.fecha_desde = 'fecha_desde debe ser YYYY-MM-DD';
    } else fechaDesde = b.fecha_desde;
  }

  const filas = [];
  let repetidas = 0;
  if (!Array.isArray(b.filas) || b.filas.length === 0) errores.filas = 'seleccione al menos un trabajador';
  else if (b.filas.length > TOPE) errores.filas = 'máximo ' + TOPE + ' asignaciones por operación';
  else {
    const vistas = new Set();
    const areaDe = {};
    b.filas.forEach(function (f, i) {
      if (!f || !entero(f.trabajador_id) || !entero(f.area_id)) {
        errores['filas.' + i] = 'cada fila necesita trabajador_id y area_id enteros';
        return;
      }
      const clave = Number(f.trabajador_id) + '-' + Number(f.area_id);
      if (vistas.has(clave)) { repetidas++; return; }
      // D-PEV-01-2: un área por trabajador en cada operación.
      if (areaDe[f.trabajador_id] !== undefined) {
        errores['filas.' + i] = 'el trabajador ' + f.trabajador_id + ' aparece con dos áreas; elija una';
        return;
      }
      areaDe[f.trabajador_id] = Number(f.area_id);
      vistas.add(clave);
      filas.push({ trabajador_id: Number(f.trabajador_id), area_id: Number(f.area_id) });
    });
  }

  if (Object.keys(errores).length) throw new AppError('VALIDATION_ERROR', 'Datos inválidos', 400, errores);
  return {
    cliente_id: Number(b.cliente_id),
    turno_id: Number(b.turno_id),
    fecha_desde: fechaDesde || fecha.hoySantiago(),
    actividad_id: tieneId ? Number(b.actividad_id) : null,
    actividad_nombre: nombre || null,
    filas: filas,
    repetidas: repetidas
  };
}

/**
 * Clasifica cada fila con las reglas de asignaciones.crear (sin escribir). Con `t`, bloquea las asignaciones existentes
 * de la actividad para que la ejecución no compita con altas concurrentes.
 */
async function clasificar(e, t) {
  const opc = t ? { transaction: t } : {};

  let actividad = null;
  if (e.actividad_id) {
    actividad = plano(await Actividad.findById(e.actividad_id, t ? { transaction: t, lock: t.LOCK.UPDATE } : {}));
    if (!actividad) throw new AppError('ACTIVIDAD_NO_EXISTE', 'no existe la actividad ' + e.actividad_id, 404, { actividad_id: e.actividad_id });
    if (Number(actividad.estado) !== ACTIVO) throw new AppError('ACTIVIDAD_INACTIVA', 'la actividad no está activa', 409, { actividad_id: actividad.id });
    if (Number(actividad.cliente_id) !== e.cliente_id) {
      throw new AppError('ACTIVIDAD_CLIENTE_DISTINTO', 'la actividad no pertenece al cliente elegido', 409, { actividad_id: actividad.id });
    }
  } else {
    // Igual que actividades.crear: no se repite el nombre dentro del cliente.
    const misma = await Actividad.findOne(Object.assign({ where: { cliente_id: e.cliente_id, nombre: e.actividad_nombre }, attributes: ['id'] }, opc));
    if (misma) {
      throw new AppError('ACTIVIDAD_DUPLICADA', 'ya existe una actividad con ese nombre para el cliente; elíjala como existente', 409, {
        cliente_id: e.cliente_id, nombre: e.actividad_nombre
      });
    }
  }

  const turno = plano(await Turno.findById(e.turno_id, opc));
  if (!turno) throw new AppError('TURNO_NO_EXISTE', 'no existe el turno ' + e.turno_id, 404, { turno_id: e.turno_id });
  if (Number(turno.clienteId) !== e.cliente_id) {
    throw new AppError('TURNO_CLIENTE_DISTINTO', 'el turno no pertenece al cliente elegido', 409, { turno_id: turno.id });
  }

  const idsArea = Array.from(new Set(e.filas.map((f) => f.area_id)));
  const idsTrab = Array.from(new Set(e.filas.map((f) => f.trabajador_id)));
  const areas = (await Area.findAll(Object.assign({ where: { id: idsArea } }, opc))).map(plano);
  const sectores = areas.length ? (await Sector.findAll(Object.assign({ where: { id: Array.from(new Set(areas.map((a) => a.sectoreId))) } }, opc))).map(plano) : [];
  const trabajadores = (await Trabajadore.findAll(Object.assign({ where: { id: idsTrab }, attributes: ['id'] }, opc))).map(plano);
  const existentes = actividad ? (await ActividadAsignacion.findAll(Object.assign({
    where: { actividad_id: actividad.id, turno_id: e.turno_id, trabajador_id: idsTrab, area_id: idsArea }
  }, opc))).map(plano) : []; // sin lock: la actividad ya está bloqueada y crearEnTx bloquea cada clave en su orden

  const clientePorSector = {};
  sectores.forEach((s) => { clientePorSector[s.id] = Number(s.clienteId); });
  const areaPorId = {};
  areas.forEach((a) => { areaPorId[a.id] = a; });
  const trabajadorExiste = new Set(trabajadores.map((x) => x.id));

  const filas = e.filas.map(function (f) {
    const area = areaPorId[f.area_id];
    let resultado = RESULTADOS.CREAR;
    if (!area) resultado = RESULTADOS.AREA_NO_EXISTE;
    else if (clientePorSector[area.sectoreId] !== e.cliente_id) resultado = RESULTADOS.AREA_CLIENTE_DISTINTO;
    else if (!trabajadorExiste.has(f.trabajador_id)) resultado = RESULTADOS.TRABAJADOR_NO_EXISTE;
    else {
      const mismas = existentes.filter((x) => x.trabajador_id === f.trabajador_id && x.area_id === f.area_id);
      if (mismas.some((x) => x.estado === 'ACTIVA')) resultado = RESULTADOS.YA_ASIGNADA;
      else if (mismas.some((x) => x.estado === 'CERRADA' && x.fecha_hasta !== null && String(x.fecha_hasta) >= e.fecha_desde)) {
        resultado = RESULTADOS.VIGENCIA_SOLAPADA;
      }
    }
    return { trabajador_id: f.trabajador_id, area_id: f.area_id, resultado: resultado };
  });

  const cuenta = (r) => filas.filter((f) => f.resultado === r).length;
  const crear = cuenta(RESULTADOS.CREAR);
  const omitidas = filas.filter((f) => OMITIBLES.indexOf(f.resultado) !== -1).length;
  return {
    actividad: actividad ? { id: actividad.id, nombre: actividad.nombre, nueva: false } : { id: null, nombre: e.actividad_nombre, nueva: true },
    turno: { id: turno.id, nombre: turno.nombre },
    fecha_desde: e.fecha_desde,
    filas: filas,
    resumen: { a_crear: crear, ya_asignadas: omitidas, con_error: filas.length - crear - omitidas, repetidas_en_la_seleccion: e.repetidas },
    // RF-PEV-02 (AUT-016, obs. 12): cronogramas activos donde se reflejará; si no hay, aviso (no bloquea).
    // Solo en la vista previa: al confirmar (t) no se consulta con otra conexión mientras la transacción tiene locks.
    cronograma: t ? undefined : await require('./cronograma-asignacion').destinoVistaPrevia(e.cliente_id, turno.id, e.fecha_desde)
  };
}

/** Vista previa: qué se crearía, qué se omite y qué impide confirmar. No escribe nada. */
async function previsualizar(body) {
  return clasificar(normalizar(body), null);
}

/**
 * Ejecuta en una sola transacción. Si alguna fila tiene error, no crea nada (409 con el detalle por fila).
 * @param {object} body
 * @param {{usuario: object, ip?: string}} contexto
 * @param {{crearActividadEnTx: function, crearAsignacionEnTx: function}} deps funciones de services/pev (AUT-008)
 */
async function ejecutar(body, contexto, deps) {
  if (!deps || typeof deps.crearAsignacionEnTx !== 'function' || typeof deps.crearActividadEnTx !== 'function') {
    throw new AppError('NO_DISPONIBLE', 'la asignación masiva aún no está conectada a la creación de asignaciones', 503);
  }
  const e = normalizar(body);
  // Mismo reintento que asignaciones.crear ante deadlock/lock timeout (la transacción entera se revierte).
  return reintentarTransaccion(() => db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
    const plan = await clasificar(e, t);
    if (plan.resumen.con_error > 0) {
      throw new AppError('ASIGNACION_MASIVA_INVALIDA', 'hay filas que no se pueden asignar; revise la vista previa', 409, {
        filas: plan.filas.filter((f) => f.resultado !== RESULTADOS.CREAR && OMITIBLES.indexOf(f.resultado) === -1)
      });
    }
    let actividadId = plan.actividad.id;
    if (plan.actividad.nueva) {
      const creada = plano(await deps.crearActividadEnTx(t, e.cliente_id, e.actividad_nombre, contexto));
      actividadId = creada.id;
      plan.actividad.id = creada.id;
    }
    const creadas = [];
    for (const f of plan.filas) {
      if (f.resultado !== RESULTADOS.CREAR) continue;
      const a = plano(await deps.crearAsignacionEnTx(t, {
        actividad_id: actividadId, area_id: f.area_id, trabajador_id: f.trabajador_id, turno_id: e.turno_id, fecha_desde: e.fecha_desde
      }, contexto));
      creadas.push(a.id);
    }
    return Object.assign(plan, { asignaciones_creadas: creadas });
  }));
}

/**
 * Datos para la pantalla. Sin cliente: lista de clientes. Con cliente: sus actividades, áreas y turnos activos y los
 * trabajadores activos, marcando los que ya trabajaron en ese cliente (asignaciones o listas PEV de sus cronogramas).
 * @param {number|null} clienteId
 */
async function opciones(clienteId) {
  const q = (sql, r) => db.sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
  if (!clienteId) {
    const clientes = await q('SELECT id, representante AS nombre FROM clientes WHERE estado = 1 ORDER BY representante');
    return { clientes: clientes };
  }
  if (!entero(clienteId)) throw new AppError('VALIDATION_ERROR', 'cliente_id debe ser un entero mayor que 0', 400, { campo: 'cliente_id' });
  const id = Number(clienteId);
  const [actividades, areas, turnos, trabajadores, conHistorial] = await Promise.all([
    q('SELECT id, nombre FROM actividades WHERE cliente_id = ? AND estado = 1 ORDER BY nombre', [id]),
    q('SELECT a.id, a.nombre, s.nombre AS sector FROM areas a JOIN sectores s ON s.id = a.sectoreId ' +
      'WHERE s.clienteId = ? AND a.estado = 1 ORDER BY s.nombre, a.nombre', [id]),
    q('SELECT id, nombre FROM turnos WHERE clienteId = ? AND estado = 1 ORDER BY nombre', [id]),
    q('SELECT id, nombre, apellido, rut, n_empleado FROM trabajadores WHERE estado = 1 ORDER BY apellido, nombre'),
    q('SELECT DISTINCT x.trabajador_id AS id FROM actividad_asignaciones x JOIN actividades a ON a.id = x.actividad_id WHERE a.cliente_id = ? ' +
      'UNION SELECT DISTINCT t.id FROM listas_pev_trabajadores l JOIN cronogramas c ON c.id = l.cronogramaId ' +
      'JOIN trabajadores t ON t.n_empleado = l.n_empleado WHERE c.clienteId = ?', [id, id])
  ]);
  const ya = new Set(conHistorial.map((r) => r.id));
  return {
    actividades: actividades,
    areas: areas,
    turnos: turnos,
    trabajadores: trabajadores.map((t) => Object.assign(t, { ya_trabajo_en_cliente: ya.has(t.id) }))
  };
}

module.exports = { TOPE, RESULTADOS, normalizar, previsualizar, ejecutar, opciones };
