/**
 * RF-PEV-02a — Capa HTTP de actividades y asignaciones (api/v1/pev). Solo Admin (la autorización
 * se monta a nivel de path en index.js). Responde { ok, data, meta }; errores por el middleware
 * centralizado (spec §2.6). Validación de entrada en esta capa -> 400 CAMPO_INVALIDO.
 */

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const actividades = require('../../../services/pev/actividades');
const asignaciones = require('../../../services/pev/asignaciones');
const cumplimiento = require('../../../services/pev/cumplimiento');

const LIMIT_DEFECTO = 20;
const LIMIT_MAX = 100;
const PAGE_MAX = 1000000;

const ESTADOS = asignaciones.ESTADOS; // ['ACTIVA', 'CERRADA', 'ANULADA']

const invalido = (mensaje, details) => new AppError('CAMPO_INVALIDO', mensaje, 400, details);

function entero(valor, campo, min, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isSafeInteger(n) || n < min || (max !== undefined && n > max)) {
    throw invalido(campo + ' invalido', { campo: campo });
  }
  return n;
}

function enteroOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return entero(valor, campo, 1);
}

function validarFecha(valor, campo) {
  // esFechaValida solo chequea formato (acepta 2026-02-31): el día debe existir en el mes.
  if (!fecha.esFechaValida(valor) || new Date(valor + 'T00:00:00Z').toISOString().slice(0, 10) !== valor) {
    throw invalido(campo + ' debe tener formato YYYY-MM-DD', { campo: campo });
  }
  return valor;
}

function validarEstado(valor) {
  if (ESTADOS.indexOf(valor) === -1) {
    throw invalido('estado invalido', { campo: 'estado', permitidos: ESTADOS });
  }
  return valor;
}

function usuarioDesdeRequest(req) {
  return { id: req.usuario.id, contexto: req.usuario.contexto };
}

function paginacion(query) {
  const page = query.page === undefined || query.page === '' ? 1 : entero(query.page, 'page', 1, PAGE_MAX);
  const limit = query.limit === undefined || query.limit === '' ? LIMIT_DEFECTO : entero(query.limit, 'limit', 1, LIMIT_MAX);
  return { page: page, limit: limit };
}

function serializarActividad(fila) {
  const p = fila.get ? fila.get({ plain: true }) : fila;
  return {
    id: p.id,
    cliente_id: p.cliente_id,
    nombre: p.nombre,
    estado: p.estado,
    origen: p.origen,
    created_by: p.created_by,
    created_at: p.created_at,
    updated_at: p.updated_at,
    pasos: (p.pasos || []).map(function (s) {
      return { id: s.id, actividad_id: s.actividad_id, orden: s.orden, nombre: s.nombre, columna_legacy: s.columna_legacy, estado: s.estado };
    })
  };
}

function serializarAsignacion(fila) {
  const p = fila.get ? fila.get({ plain: true }) : fila;
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
    activa_flag: p.activa_flag,
    origen: p.origen,
    motivo: p.motivo,
    created_by: p.created_by,
    cerrada_by: p.cerrada_by,
    created_at: p.created_at,
    updated_at: p.updated_at,
    cerrada_at: p.cerrada_at,
    actividad: p.actividad ? { id: p.actividad.id, nombre: p.actividad.nombre, cliente_id: p.actividad.cliente_id } : null,
    area: p.area ? { id: p.area.id, nombre: p.area.nombre } : null,
    trabajador: p.trabajador
      ? { id: p.trabajador.id, nombre: p.trabajador.nombre, apellido: p.trabajador.apellido, n_empleado: p.trabajador.n_empleado }
      : null,
    turno: p.turno ? { id: p.turno.id, nombre: p.turno.nombre } : null
  };
}

const listarActividades = async (req, res) => {
  const q = req.query || {};
  const { page, limit } = paginacion(q);
  const filtros = {
    cliente_id: enteroOpcional(q.cliente_id, 'cliente_id'),
    estado: q.estado === undefined || q.estado === '' ? undefined : entero(q.estado, 'estado', 0),
    page: page,
    limit: limit
  };

  const r = await actividades.listar(filtros);
  return res.json({
    ok: true,
    data: r.rows.map(serializarActividad),
    meta: { page: filtros.page, limit: filtros.limit, total: r.count }
  });
};

const crearActividad = async (req, res) => {
  const body = req.body || {};
  const clienteId = entero(body.cliente_id, 'cliente_id', 1);
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  if (!nombre || nombre.length > 100) {
    throw invalido('nombre debe tener entre 1 y 100 caracteres', { campo: 'nombre' });
  }

  const data = await actividades.crear({ cliente_id: clienteId, nombre: nombre }, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.status(201).json({ ok: true, data: serializarActividad(data) });
};

const listarAsignaciones = async (req, res) => {
  const q = req.query || {};
  const { page, limit } = paginacion(q);

  const filtros = {
    cliente_id: enteroOpcional(q.cliente_id, 'cliente_id'),
    actividad_id: enteroOpcional(q.actividad_id, 'actividad_id'),
    area_id: enteroOpcional(q.area_id, 'area_id'),
    trabajador_id: enteroOpcional(q.trabajador_id, 'trabajador_id'),
    turno_id: enteroOpcional(q.turno_id, 'turno_id'),
    estado: q.estado === undefined || q.estado === '' ? undefined : validarEstado(q.estado),
    vigente_en: q.vigente_en === undefined || q.vigente_en === '' ? undefined : validarFecha(q.vigente_en, 'vigente_en'),
    page: page,
    limit: limit
  };

  const r = await asignaciones.listar(filtros);
  return res.json({
    ok: true,
    data: r.rows.map(serializarAsignacion),
    meta: { page: page, limit: limit, total: r.count }
  });
};

const crearAsignacion = async (req, res) => {
  const body = req.body || {};
  const entrada = {
    actividad_id: entero(body.actividad_id, 'actividad_id', 1),
    area_id: entero(body.area_id, 'area_id', 1),
    trabajador_id: entero(body.trabajador_id, 'trabajador_id', 1),
    turno_id: entero(body.turno_id, 'turno_id', 1),
    fecha_desde: body.fecha_desde === undefined || body.fecha_desde === '' ? undefined : validarFecha(body.fecha_desde, 'fecha_desde'),
    tarea_id: enteroOpcional(body.tarea_id, 'tarea_id')
  };

  if (body.fecha_hasta !== undefined && body.fecha_hasta !== null && body.fecha_hasta !== '') {
    throw invalido('no se acepta fecha_hasta al crear (se fija al cerrar)', { campo: 'fecha_hasta' });
  }

  const data = await asignaciones.crear(entrada, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.status(201).json({ ok: true, data: serializarAsignacion(data) });
};

const cerrarAsignacion = async (req, res) => {
  const id = entero(req.params.id, 'id', 1);
  const body = req.body || {};
  const datos = {
    fecha_hasta: body.fecha_hasta === undefined || body.fecha_hasta === '' ? undefined : validarFecha(body.fecha_hasta, 'fecha_hasta'),
    motivo: typeof body.motivo === 'string' && body.motivo.trim() ? body.motivo.trim() : undefined
  };
  if (datos.motivo && datos.motivo.length > 500) {
    throw invalido('motivo admite hasta 500 caracteres', { campo: 'motivo' });
  }

  const data = await asignaciones.cerrar(id, datos, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: serializarAsignacion(data), meta: { lineas_posteriores: data.lineas_posteriores || 0 } });
};

const anularAsignacion = async (req, res) => {
  const id = entero(req.params.id, 'id', 1);
  const body = req.body || {};
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
  if (!motivo) {
    throw invalido('motivo es obligatorio', { campo: 'motivo' });
  }

  const data = await asignaciones.anular(id, { motivo: motivo }, { usuario: usuarioDesdeRequest(req), ip: req.ip });
  return res.json({ ok: true, data: serializarAsignacion(data) });
};

const verCumplimiento = async (req, res) => {
  const id = entero(req.params.id, 'id', 1);
  const q = req.query || {};
  const { page, limit } = paginacion(q);
  const filtros = {
    desde: q.desde === undefined || q.desde === '' ? undefined : validarFecha(q.desde, 'desde'),
    hasta: q.hasta === undefined || q.hasta === '' ? undefined : validarFecha(q.hasta, 'hasta'),
    page: page,
    limit: limit
  };

  const r = await cumplimiento.historial(id, filtros);
  return res.json({ ok: true, data: r.rows, meta: { page: page, limit: limit, total: r.count } });
};

module.exports = {
  listarActividades: listarActividades,
  crearActividad: crearActividad,
  listarAsignaciones: listarAsignaciones,
  crearAsignacion: crearAsignacion,
  cerrarAsignacion: cerrarAsignacion,
  anularAsignacion: anularAsignacion,
  verCumplimiento: verCumplimiento
};
