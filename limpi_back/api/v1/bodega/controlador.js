/**
 * RF-BOD-01 — Capa HTTP de /api/v1/bodega. Valida la entrada (borde de confianza) y da forma a la salida
 * { ok, data, meta } (spec §2.6). La lógica vive en services/bodega/solicitudes.js.
 */

const AppError = require('../../../libs/app-error');
const servicio = require('../../../services/bodega/solicitudes');
const { ESTADOS_SOLICITUD: E, ROL_BODEGA_ADMIN_NOMBRES } = require('../../../services/bodega/constantes');

const MAX_ITEMS = 100;
const MAX_CANTIDAD = 100000;
const MAX_TEXTO = 500;
const LIMIT_DEFECTO = 20;
const LIMIT_MAX = 100;
const PAGE_MAX = 10000;

const invalido = (mensaje, details) => new AppError('VALIDATION_ERROR', mensaje, 400, details);

function enteroPositivo(valor, campo, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < 1 || (max && n > max)) {
    throw invalido(campo + ' debe ser un entero mayor que 0' + (max ? ' y menor o igual a ' + max : ''), { campo: campo });
  }
  return n;
}

function textoOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw invalido(campo + ' debe ser texto', { campo: campo });
  const t = valor.trim();
  if (t.length > MAX_TEXTO) throw invalido(campo + ' admite hasta ' + MAX_TEXTO + ' caracteres', { campo: campo });
  return t || null;
}

// Uno o varios estados separados por coma (la UI filtra "En proceso" = PARCIAL,LISTA_ENTREGA).
function estadosOpcionales(valor) {
  if (valor === undefined || valor === '') return null;
  const lista = typeof valor === 'string' ? valor.split(',').map((v) => v.trim()) : [];
  if (lista.length === 0 || lista.some((v) => Object.keys(E).indexOf(v) === -1)) {
    throw invalido('estado no valido', { campo: 'estado', permitidos: Object.keys(E) });
  }
  return Array.from(new Set(lista));
}

// Qué puede hacer quien consulta (la UI muestra solo esto; el servicio vuelve a validarlo).
function acciones(solicitud, usuario) {
  const gestor = !usuario.es_supervisor && ROL_BODEGA_ADMIN_NOMBRES.map((n) => n.toLowerCase()).indexOf(String(usuario.rol_nombre || '').toLowerCase()) !== -1;
  const finalizada = solicitud.estado === E.ENTREGADA || solicitud.estado === E.ANULADA;
  return {
    puede_anular: usuario.es_supervisor ? solicitud.estado === E.PENDIENTE : gestor && !finalizada
  };
}

const conAcciones = (data, req) => ({ ok: true, data: data, meta: { acciones: acciones(data, req.usuario) } });

function paginacion(q) {
  return {
    page: q.page === undefined ? 1 : enteroPositivo(q.page, 'page', PAGE_MAX),
    limit: q.limit === undefined ? LIMIT_DEFECTO : enteroPositivo(q.limit, 'limit', LIMIT_MAX)
  };
}

// Regla 4: un producto no se repite; si viene dos veces se suman las cantidades.
function validarCreacion(body) {
  const b = body || {};
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > MAX_ITEMS) {
    throw invalido('items debe ser una lista de 1 a ' + MAX_ITEMS + ' productos', { campo: 'items' });
  }
  const suma = {};
  b.items.forEach(function (item, i) {
    if (!item || typeof item !== 'object') throw invalido('items[' + i + '] no es valido', { campo: 'items[' + i + ']' });
    const producto = enteroPositivo(item.producto_id, 'items[' + i + '].producto_id');
    if (typeof item.cantidad !== 'number') throw invalido('items[' + i + '].cantidad debe ser numerico', { campo: 'items[' + i + '].cantidad' });
    suma[producto] = (suma[producto] || 0) + enteroPositivo(item.cantidad, 'items[' + i + '].cantidad', MAX_CANTIDAD);
  });
  const items = Object.keys(suma).map(function (p) {
    if (suma[p] > MAX_CANTIDAD) throw invalido('la cantidad total del producto ' + p + ' supera ' + MAX_CANTIDAD, { producto_id: Number(p) });
    return { producto_id: Number(p), cantidad: suma[p] };
  });
  return {
    centro_costo_id: enteroPositivo(b.centro_costo_id, 'centro_costo_id'),
    items: items,
    observacion: textoOpcional(b.observacion, 'observacion')
  };
}

async function productosSolicitables(req, res) {
  const data = await servicio.listarProductosSolicitables();
  return res.json({ ok: true, data: data, meta: { total: data.length } });
}

async function centrosPermitidos(req, res) {
  const data = await servicio.listarCentrosPermitidos(req.usuario);
  return res.json({ ok: true, data: data, meta: { total: data.length } });
}

async function crear(req, res) {
  const data = await servicio.crear(validarCreacion(req.body), req.usuario, req.ip);
  return res.status(201).json(conAcciones(data, req));
}

async function listar(req, res) {
  const filtros = Object.assign(paginacion(req.query), {
    estados: estadosOpcionales(req.query.estado),
    centro_costo_id: req.query.centro_costo_id === undefined || req.query.centro_costo_id === '' ? null : enteroPositivo(req.query.centro_costo_id, 'centro_costo_id')
  });
  const r = await servicio.listar(filtros, req.usuario);
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

async function listarMias(req, res) {
  const filtros = Object.assign(paginacion(req.query), { estados: estadosOpcionales(req.query.estado) });
  const r = await servicio.listarMias(filtros, req.usuario);
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

async function obtener(req, res) {
  const data = await servicio.obtener(enteroPositivo(req.params.id, 'id'), req.usuario);
  return res.json(conAcciones(data, req));
}

async function anular(req, res) {
  const motivo = textoOpcional(req.body && req.body.motivo, 'motivo');
  const data = await servicio.anular(enteroPositivo(req.params.id, 'id'), motivo, req.usuario, req.ip);
  return res.json(conAcciones(data, req));
}

module.exports = {
  productosSolicitables,
  centrosPermitidos,
  crear,
  listar,
  listarMias,
  obtener,
  anular,
  validarCreacion
};
