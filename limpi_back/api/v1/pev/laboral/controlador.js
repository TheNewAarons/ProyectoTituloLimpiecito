/**
 * RF-PEV-02c — Capa HTTP de las rutas laborales (api/v1/pev/laboral). El auth lo monta index.js
 * (autenticarLaboral / exigirSupervisor) antes del gate Admin de /api/v1/pev. Responde
 * { ok, data, meta }; errores por el middleware centralizado. Validación de entrada aquí -> 400
 * CAMPO_INVALIDO. Nunca se pasa req.body al ORM (mass assignment): solo valores ya validados.
 */

const Sequelize = require('sequelize');

const AppError = require('../../../../libs/app-error');
const fecha = require('../../../../libs/fecha');
const asignaciones = require('../../../../services/pev/asignaciones');
const cumplimiento = require('../../../../services/pev/cumplimiento');
const ActividadPaso = require('../../../../modelos/apartado_listas_pev/actividadPaso');

const Op = Sequelize.Op;
const LIMIT_DEFECTO = 20;
const LIMIT_MAX = 100;
const PAGE_MAX = 1000000;

const invalido = (mensaje, details) => new AppError('CAMPO_INVALIDO', mensaje, 400, details);

function entero(valor, campo, min, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isSafeInteger(n) || n < min || (max !== undefined && n > max)) {
    throw invalido(campo + ' invalido', { campo: campo });
  }
  return n;
}

function validarFecha(valor, campo) {
  // esFechaValida solo chequea formato (acepta 2026-02-31): el día debe existir en el mes.
  if (!fecha.esFechaValida(valor) || new Date(valor + 'T00:00:00Z').toISOString().slice(0, 10) !== valor) {
    throw invalido(campo + ' debe tener formato YYYY-MM-DD', { campo: campo });
  }
  return valor;
}

function paginacion(query) {
  const page = query.page === undefined || query.page === '' ? 1 : entero(query.page, 'page', 1, PAGE_MAX);
  const limit = query.limit === undefined || query.limit === '' ? LIMIT_DEFECTO : entero(query.limit, 'limit', 1, LIMIT_MAX);
  return { page: page, limit: limit };
}

function bodyVacio(req) {
  const body = req.body === null || req.body === undefined ? {} : req.body;
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw invalido('body invalido', { campo: 'body' });
  }
  const claves = Object.keys(body);
  if (claves.length !== 0) {
    throw invalido('no se aceptan campos en el body', { campo: claves[0] });
  }
}

function serializarAsignacion(a) {
  const p = a.get ? a.get({ plain: true }) : a;
  return {
    id: p.id,
    actividad_id: p.actividad_id,
    area_id: p.area_id,
    trabajador_id: p.trabajador_id,
    tarea_id: p.tarea_id,
    turno_id: p.turno_id,
    fecha_desde: p.fecha_desde,
    fecha_hasta: p.fecha_hasta,
    estado: p.estado,
    actividad: p.actividad ? { id: p.actividad.id, nombre: p.actividad.nombre, cliente_id: p.actividad.cliente_id } : null,
    area: p.area ? { id: p.area.id, nombre: p.area.nombre } : null,
    turno: p.turno ? { id: p.turno.id, nombre: p.turno.nombre } : null
  };
}

const listarAsignacionesTrabajador = async (req, res) => {
  const q = req.query || {};
  const fechaValor = q.fecha === undefined || q.fecha === '' ? fecha.hoySantiago() : validarFecha(q.fecha, 'fecha');
  const { page, limit } = paginacion(q);

  const r = await asignaciones.listar({ trabajador_id: req.usuario.id, vigente_en: fechaValor, page: page, limit: limit });

  const actividadIds = [];
  const vistos = {};
  r.rows.forEach(function (a) {
    const id = a.actividad_id;
    if (id !== null && id !== undefined && !vistos[id]) {
      vistos[id] = true;
      actividadIds.push(id);
    }
  });

  let pasosPorActividad = {};
  if (actividadIds.length) {
    const pasos = await ActividadPaso.findAll({
      where: { actividad_id: { [Op.in]: actividadIds }, estado: 1 },
      order: [['actividad_id', 'ASC'], ['orden', 'ASC']]
    });
    pasos.forEach(function (p) {
      if (!pasosPorActividad[p.actividad_id]) pasosPorActividad[p.actividad_id] = [];
      pasosPorActividad[p.actividad_id].push({
        id: p.id,
        orden: p.orden,
        nombre: p.nombre,
        columna_legacy: p.columna_legacy
      });
    });
  }

  const lineas = await cumplimiento.delDia(req.usuario.id, fechaValor);
  const lineasPorAsignacion = {};
  lineas.forEach(function (l) {
    if (!lineasPorAsignacion[l.asignacionId]) lineasPorAsignacion[l.asignacionId] = [];
    lineasPorAsignacion[l.asignacionId].push(l);
  });

  const data = r.rows.map(function (a) {
    const base = serializarAsignacion(a);
    base.pasos = pasosPorActividad[a.actividad_id] || [];
    base.lineas = lineasPorAsignacion[a.id] || [];
    return base;
  });

  return res.json({ ok: true, data: data, meta: { page: page, limit: limit, total: r.count, fecha: fechaValor } });
};

const marcarPaso = async (req, res) => {
  const lineaId = entero(req.params.lineaId, 'lineaId', 1);
  const paso = entero(req.params.paso, 'paso', 1, 3);
  bodyVacio(req);
  const r = await cumplimiento.marcarPaso(lineaId, paso, { usuario: req.usuario, ip: req.ip });
  return res.json({ ok: true, data: r.linea, meta: { sin_cambios: r.sin_cambios } });
};

// Valida {despolvado, aplicacion_producto, abrillantado} (3 obligatorias, 0/1, sin claves extra) -> 400.
function valoresChequeo(req) {
  const body = req.body === null || req.body === undefined ? {} : req.body;
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw invalido('body invalido', { campo: 'body' });
  }
  const permitidas = ['despolvado', 'aplicacion_producto', 'abrillantado'];
  const claves = Object.keys(body);
  const extras = claves.filter(function (c) { return permitidas.indexOf(c) === -1; });
  if (extras.length) {
    throw invalido('campo no permitido', { campo: extras[0] });
  }
  const valores = {};
  permitidas.forEach(function (c) {
    if (body[c] === undefined) {
      throw invalido('campo obligatorio', { campo: c });
    }
    valores[c] = entero(body[c], c, 0, 1);
  });
  return valores;
}

const chequear = async (req, res) => {
  const lineaId = entero(req.params.lineaId, 'lineaId', 1);
  const ronda = entero(req.params.ronda, 'ronda', 1, 3);
  const valores = valoresChequeo(req);
  const r = await cumplimiento.chequear(lineaId, ronda, valores, { usuario: req.usuario, ip: req.ip });
  return res.json({ ok: true, data: r.linea, meta: { sin_cambios: r.sin_cambios } });
};

const observar = async (req, res) => {
  const lineaId = entero(req.params.lineaId, 'lineaId', 1);
  const body = req.body === null || req.body === undefined ? {} : req.body;
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw invalido('body invalido', { campo: 'body' });
  }
  const claves = Object.keys(body);
  const extras = claves.filter(function (c) { return c !== 'observaciones'; });
  if (extras.length) {
    throw invalido('campo no permitido', { campo: extras[0] });
  }
  if (body.observaciones === undefined) {
    throw invalido('observaciones es obligatorio', { campo: 'observaciones' });
  }
  let observaciones;
  if (body.observaciones === null) {
    observaciones = '';
  } else if (typeof body.observaciones === 'string') {
    observaciones = body.observaciones.trim();
  } else {
    throw invalido('observaciones debe ser texto', { campo: 'observaciones' });
  }
  if (observaciones.length > 255) {
    throw invalido('observaciones admite hasta 255 caracteres', { campo: 'observaciones' });
  }
  const r = await cumplimiento.observar(lineaId, observaciones, { usuario: req.usuario, ip: req.ip });
  return res.json({ ok: true, data: r.linea, meta: { sin_cambios: r.sin_cambios } });
};

module.exports = {
  listarAsignacionesTrabajador: listarAsignacionesTrabajador,
  marcarPaso: marcarPaso,
  chequear: chequear,
  observar: observar
};
