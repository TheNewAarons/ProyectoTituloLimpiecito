/**
 * RF-BOD-04 — Capa HTTP de recepción, entrega, formato de entrega y movimientos. Valida la entrada y
 * responde { ok, data, meta } (spec §2.6). La lógica vive en services/bodega/{recepcion,entrega,movimientos}.js.
 */

const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const { TIPOS_MOVIMIENTO } = require('../../../services/bodega/constantes');

// Carga diferida de los servicios: routes.js se importa en tests que no los simulan (bodega-cruce.v1.test.js)
// y sus modelos requieren la BD real al cargarse.
const servicio = (nombre) => require('../../../services/bodega/' + nombre);

const MAX_ITEMS = 200;
const LIMIT_DEFECTO = 50;
const LIMIT_MAX = 200;
const PAGE_MAX = 10000;

const invalido = (mensaje, details) => new AppError('VALIDATION_ERROR', mensaje, 400, details);

function entero(valor, campo, min, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) {
    throw invalido(campo + ' debe ser un entero entre ' + min + ' y ' + (max === undefined ? 'el maximo' : max), { campo: campo });
  }
  return n;
}

// Sin `items` se recibe todo lo pendiente. Con `items`: enteros >= 0 (0 = no llegó), sin item_id repetidos.
function validarRecepcion(body) {
  if (!body || body.items === undefined) return null;
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    throw invalido('items debe ser una lista de 1 a ' + MAX_ITEMS + ' lineas', { campo: 'items' });
  }
  const vistos = {};
  return body.items.map(function (item, i) {
    if (!item || typeof item !== 'object') throw invalido('items[' + i + '] no es valido', { campo: 'items[' + i + ']' });
    const itemId = entero(item.item_id, 'items[' + i + '].item_id', 1);
    if (vistos[itemId]) throw invalido('item_id ' + itemId + ' repetido', { campo: 'items[' + i + '].item_id' });
    vistos[itemId] = true;
    if (typeof item.cantidad_recibida !== 'number') throw invalido('items[' + i + '].cantidad_recibida debe ser numerico', { campo: 'items[' + i + '].cantidad_recibida' });
    return { item_id: itemId, cantidad_recibida: entero(item.cantidad_recibida, 'items[' + i + '].cantidad_recibida', 0) };
  });
}

async function recibir(req, res) {
  const data = await servicio('recepcion').recibir(entero(req.params.id, 'id', 1), validarRecepcion(req.body), { usuario: { id: req.usuario.id, contexto: req.usuario.contexto }, ip: req.ip });
  return res.json({ ok: true, data: data, meta: {} });
}

async function entregar(req, res) {
  const data = await servicio('entrega').entregar(entero(req.params.id, 'id', 1), { id: req.usuario.id, contexto: req.usuario.contexto }, req.ip);
  return res.json({ ok: true, data: data, meta: {} });
}

async function formatoEntrega(req, res) {
  const data = await servicio('entrega').formatoEntrega(entero(req.params.id, 'id', 1), req.usuario);
  return res.json({ ok: true, data: data, meta: {} });
}

async function listarMovimientos(req, res) {
  const q = req.query;
  const desde = q.desde || null;
  const hasta = q.hasta || null;
  if (desde && !fecha.esFechaValida(desde)) throw invalido('desde debe tener formato YYYY-MM-DD', { campo: 'desde' });
  if (hasta && !fecha.esFechaValida(hasta)) throw invalido('hasta debe tener formato YYYY-MM-DD', { campo: 'hasta' });
  if (desde && hasta && desde > hasta) throw invalido('desde no puede ser posterior a hasta', { campo: 'desde' });
  if (q.tipo && Object.keys(TIPOS_MOVIMIENTO).indexOf(q.tipo) === -1) throw invalido('tipo no valido', { campo: 'tipo', permitidos: Object.keys(TIPOS_MOVIMIENTO) });
  const r = await servicio('movimientos').listar({
    producto_id: q.producto_id === undefined || q.producto_id === '' ? null : entero(q.producto_id, 'producto_id', 1),
    tipo: q.tipo || null,
    desde: desde,
    hasta: hasta,
    page: q.page === undefined ? 1 : entero(q.page, 'page', 1, PAGE_MAX),
    limit: q.limit === undefined ? LIMIT_DEFECTO : entero(q.limit, 'limit', 1, LIMIT_MAX)
  });
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

const ESTADOS_ORDEN = ['BORRADOR', 'ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'ANULADA'];

async function listarOrdenes(req, res) {
  const q = req.query;
  let estados = null;
  if (q.estado) {
    estados = String(q.estado).split(',').map((e) => e.trim());
    if (estados.some((e) => ESTADOS_ORDEN.indexOf(e) === -1)) throw invalido('estado no valido', { campo: 'estado', permitidos: ESTADOS_ORDEN });
  }
  const r = await servicio('ordenesConsulta').listar({
    estados: estados,
    page: q.page === undefined ? 1 : entero(q.page, 'page', 1, PAGE_MAX),
    limit: q.limit === undefined ? LIMIT_DEFECTO : entero(q.limit, 'limit', 1, LIMIT_MAX)
  });
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

async function detalleRecepcion(req, res) {
  const data = await servicio('ordenesConsulta').detalleRecepcion(entero(req.params.id, 'id', 1));
  return res.json({ ok: true, data: data, meta: {} });
}

module.exports = { recibir, entregar, formatoEntrega, listarMovimientos, listarOrdenes, detalleRecepcion, validarRecepcion };
