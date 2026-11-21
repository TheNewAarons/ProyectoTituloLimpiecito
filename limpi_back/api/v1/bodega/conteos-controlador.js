/**
 * RF-BOD-07 — Capa HTTP del conteo físico de inventario. Valida la entrada y responde { ok, data, meta } (spec §2.6).
 * La lógica vive en services/bodega/conteos.js.
 */

const AppError = require('../../../libs/app-error');

// Carga diferida: routes.js se importa en tests que no simulan los modelos (ver recepcion-controlador.js).
const servicio = () => require('../../../services/bodega/conteos');

const MAX_ITEMS = 500;
const CANTIDAD_MAX = 9999999;
const LIMIT_DEFECTO = 50;
const LIMIT_MAX = 200;
const PAGE_MAX = 10000;
const ESTADOS = ['BORRADOR', 'APROBADO', 'ANULADO'];

const invalido = (mensaje, details) => new AppError('VALIDATION_ERROR', mensaje, 400, details);
const contexto = (req) => ({ usuario: { id: req.usuario.id, contexto: req.usuario.contexto }, ip: req.ip });

function entero(valor, campo, min, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
    throw invalido(campo + ' debe ser un entero entre ' + min + ' y ' + (max === undefined ? 'el maximo' : max), { campo: campo });
  }
  return n;
}

function texto(v, campo, max) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.trim().length > max) throw invalido(campo + ' debe ser texto de hasta ' + max + ' caracteres', { campo: campo });
  return v.trim() || null;
}

// Sin producto_ids se cuentan todos los productos activos.
function validarCreacion(body) {
  const b = body || {};
  let ids = null;
  if (b.producto_ids !== undefined && b.producto_ids !== null) {
    if (!Array.isArray(b.producto_ids) || b.producto_ids.length === 0 || b.producto_ids.length > MAX_ITEMS) {
      throw invalido('producto_ids debe ser una lista de 1 a ' + MAX_ITEMS + ' productos', { campo: 'producto_ids' });
    }
    ids = Array.from(new Set(b.producto_ids.map((id, i) => {
      if (typeof id !== 'number') throw invalido('producto_ids[' + i + '] debe ser numerico', { campo: 'producto_ids[' + i + ']' });
      return entero(id, 'producto_ids[' + i + ']', 1);
    })));
  }
  return { producto_ids: ids, observacion: texto(b.observacion, 'observacion', 255) };
}

// cantidad_contada: entero >= 0, o null para limpiar la línea. Sin item_id repetidos.
function validarCaptura(body) {
  const items = body && body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw invalido('items debe ser una lista de 1 a ' + MAX_ITEMS + ' lineas', { campo: 'items' });
  }
  const vistos = {};
  return items.map(function (item, i) {
    if (!item || typeof item !== 'object') throw invalido('items[' + i + '] no es valido', { campo: 'items[' + i + ']' });
    const itemId = entero(item.item_id, 'items[' + i + '].item_id', 1);
    if (vistos[itemId]) throw invalido('item_id ' + itemId + ' repetido', { campo: 'items[' + i + '].item_id' });
    vistos[itemId] = true;
    let contada = null;
    if (item.cantidad_contada !== null && item.cantidad_contada !== undefined) {
      if (typeof item.cantidad_contada !== 'number') throw invalido('items[' + i + '].cantidad_contada debe ser numerico', { campo: 'items[' + i + '].cantidad_contada' });
      contada = entero(item.cantidad_contada, 'items[' + i + '].cantidad_contada', 0, CANTIDAD_MAX);
    }
    return { item_id: itemId, cantidad_contada: contada, motivo: texto(item.motivo, 'items[' + i + '].motivo', 255) };
  });
}

async function crear(req, res) {
  const data = await servicio().crear(validarCreacion(req.body), contexto(req));
  return res.status(201).json({ ok: true, data: data, meta: {} });
}

async function listar(req, res) {
  const q = req.query;
  if (q.estado && ESTADOS.indexOf(q.estado) === -1) throw invalido('estado no valido', { campo: 'estado', permitidos: ESTADOS });
  const r = await servicio().listar({
    estado: q.estado || null,
    page: q.page === undefined ? 1 : entero(q.page, 'page', 1, PAGE_MAX),
    limit: q.limit === undefined ? LIMIT_DEFECTO : entero(q.limit, 'limit', 1, LIMIT_MAX)
  });
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

async function obtener(req, res) {
  const data = await servicio().obtener(entero(req.params.id, 'id', 1));
  return res.json({ ok: true, data: data, meta: {} });
}

async function capturar(req, res) {
  const data = await servicio().capturar(entero(req.params.id, 'id', 1), validarCaptura(req.body), contexto(req));
  return res.json({ ok: true, data: data, meta: {} });
}

async function anular(req, res) {
  const data = await servicio().anular(entero(req.params.id, 'id', 1), texto((req.body || {}).motivo, 'motivo', 255), contexto(req));
  return res.json({ ok: true, data: data, meta: {} });
}

async function aprobar(req, res) {
  const data = await servicio().aprobar(entero(req.params.id, 'id', 1), contexto(req));
  return res.json({ ok: true, data: data, meta: {} });
}

module.exports = { crear, listar, obtener, capturar, anular, aprobar, validarCreacion, validarCaptura };
