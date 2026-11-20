/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — Capa HTTP de /api/v1/bodega/productos (Admin y Operaciones), equivalente de /producto/*.
 * La lógica vive en services/bodega/productos.js.
 */

const AppError = require('../../../libs/app-error');
// Carga diferida: los tests existentes del router de bodega simulan la BD sin `define` y no deben cargar estos modelos.
const servicio = () => require('../../../services/bodega/productos');

function ctx(req) {
  return { usuario: { id: req.usuario.id, contexto: req.usuario.contexto || 'usuarios' }, ip: req.ip };
}

function parsearId(texto) {
  const id = Number(texto);
  if (!/^\d+$/.test(String(texto)) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'id de producto invalido', 400, { id: texto });
  }
  return id;
}

/** GET /productos?estado=activo|inactivo|todos&busca=&con_stock=0|1 */
const listar = async (req, res) => {
  const data = await servicio().listar(req.query);
  return res.json({ ok: true, data: data, meta: { total: data.length } });
};

/** POST /productos */
const crear = async (req, res) => {
  return res.status(201).json({ ok: true, data: await servicio().crear(req.body, ctx(req)), meta: {} });
};

/** PUT /productos/:id */
const editar = async (req, res) => {
  return res.json({ ok: true, data: await servicio().editar(parsearId(req.params.id), req.body, ctx(req)), meta: {} });
};

/** PATCH /productos/:id/estado  body { estado: 'activo' | 'inactivo' } */
const cambiarEstado = async (req, res) => {
  const estado = req.body ? req.body.estado : undefined;
  return res.json({ ok: true, data: await servicio().cambiarEstado(parsearId(req.params.id), estado, ctx(req)), meta: {} });
};

/** DELETE /productos/:id — borrado lógico */
const borrar = async (req, res) => {
  return res.json({ ok: true, data: await servicio().borrar(parsearId(req.params.id), ctx(req)), meta: {} });
};

module.exports = { listar: listar, crear: crear, editar: editar, cambiarEstado: cambiarEstado, borrar: borrar, parsearId: parsearId, ctx: ctx };
