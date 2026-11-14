/**
 * RNF-SEC-02 — Capa HTTP de consulta de auditoría (GET /api/v1/auditoria). Solo lectura, solo
 * Admin (la autorización se monta a nivel de ruta en index.js). Responde { ok, data, meta } y
 * errores { ok:false, error } (spec §2.6). valores_antes/valores_despues se devuelven parseados.
 */

const Op = require('sequelize').Op;

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const Auditoria = require('../../../modelos/sistema_base/Auditoria');
const { CONTEXTOS_VALIDOS, limpiarSensibles } = require('../../../services/auditoria');
const { inicioDiaSantiago } = require('../../../services/bodega/movimientos');

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

// Devuelve el valor parseado si es JSON, el string original si no, y null para null/undefined.
function parsearValores(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return v; }
}

function serializar(fila) {
  return {
    id: fila.id,
    usuario_id: fila.usuario_id,
    contexto_usuario: fila.contexto_usuario,
    entidad: fila.entidad,
    entidad_id: fila.entidad_id,
    accion: fila.accion,
    valores_antes: limpiarSensibles(parsearValores(fila.valores_antes)),
    valores_despues: limpiarSensibles(parsearValores(fila.valores_despues)),
    motivo: fila.motivo,
    ip: fila.ip,
    created_at: fila.created_at
  };
}

async function listar(req, res) {
  const q = req.query || {};
  const where = {};

  if (q.entidad !== undefined && q.entidad !== '') {
    if (typeof q.entidad !== 'string' || q.entidad.length > 60) {
      throw invalido('entidad debe ser un string de como maximo 60 caracteres', { campo: 'entidad' });
    }
    where.entidad = q.entidad;
  }

  if (q.entidad_id !== undefined && q.entidad_id !== '') {
    if (!where.entidad) throw invalido('entidad_id requiere entidad', { campo: 'entidad_id' });
    const entidadId = String(q.entidad_id);
    if (entidadId.length > 64) throw invalido('entidad_id debe tener como maximo 64 caracteres', { campo: 'entidad_id' });
    where.entidad_id = entidadId;
  }

  let contexto = null;
  if (q.contexto_usuario !== undefined && q.contexto_usuario !== '') {
    if (CONTEXTOS_VALIDOS.indexOf(q.contexto_usuario) === -1) {
      throw invalido('contexto_usuario invalido', { campo: 'contexto_usuario', permitidos: CONTEXTOS_VALIDOS });
    }
    contexto = q.contexto_usuario;
  }

  if (q.usuario_id !== undefined && q.usuario_id !== '') {
    where.usuario_id = entero(q.usuario_id, 'usuario_id', 1);
    // D-076: sin contexto explícito, usuario_id usa el índice (contexto_usuario, usuario_id, created_at) con 'usuarios'.
    where.contexto_usuario = contexto || 'usuarios';
  } else if (contexto) {
    where.contexto_usuario = contexto;
  }

  if (q.accion !== undefined && q.accion !== '') {
    if (typeof q.accion !== 'string' || q.accion.length > 40) {
      throw invalido('accion debe ser un string de como maximo 40 caracteres', { campo: 'accion' });
    }
    where.accion = q.accion;
  }

  const desde = q.desde === undefined || q.desde === '' ? null : q.desde;
  const hasta = q.hasta === undefined || q.hasta === '' ? null : q.hasta;
  if (desde && !fecha.esFechaValida(desde)) throw invalido('desde debe tener formato YYYY-MM-DD', { campo: 'desde' });
  if (hasta && !fecha.esFechaValida(hasta)) throw invalido('hasta debe tener formato YYYY-MM-DD', { campo: 'hasta' });
  if (desde && hasta && desde > hasta) throw invalido('desde no puede ser posterior a hasta', { campo: 'desde' });
  if (desde || hasta) {
    where.created_at = {};
    if (desde) where.created_at[Op.gte] = inicioDiaSantiago(desde);
    if (hasta) where.created_at[Op.lt] = inicioDiaSantiago(hasta, 1); // hasta INCLUSIVO
  }

  const page = q.page === undefined || q.page === '' ? 1 : entero(q.page, 'page', 1, PAGE_MAX);
  const limit = q.limit === undefined || q.limit === '' ? LIMIT_DEFECTO : entero(q.limit, 'limit', 1, LIMIT_MAX);

  const r = await Auditoria.findAndCountAll({
    where: where,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: limit,
    offset: (page - 1) * limit
  });

  return res.json({ ok: true, data: r.rows.map(serializar), meta: { page: page, limit: limit, total: r.count } });
}

async function obtener(req, res) {
  const id = entero(req.params.id, 'id', 1);
  const fila = await Auditoria.findById(id);
  if (!fila) throw new AppError('NO_ENCONTRADO', 'registro de auditoria no encontrado', 404, { id: id });
  return res.json({ ok: true, data: serializar(fila) });
}

module.exports = { listar, obtener, serializar };
