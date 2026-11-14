/**
 * RF-BOD-05 — Capa HTTP del dashboard de bodega y del stock mínimo. Formato { ok, data, meta } (spec §2.6).
 * El servicio se carga de forma diferida (mismo motivo que recepcion-controlador.js: tests de RF-BOD-03 que
 * importan routes.js sin simular los servicios nuevos).
 */

const AppError = require('../../../libs/app-error');

const servicio = () => require('../../../services/bodega/dashboard');
const MAX_STOCK_MINIMO = 1000000;

function entero(valor, campo, min, max) {
  const n = typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new AppError('VALIDATION_ERROR', campo + ' debe ser un entero entre ' + min + ' y ' + max, 400, { campo: campo });
  }
  return n;
}

async function obtener(req, res) {
  const r = await servicio().obtener();
  return res.json({ ok: true, data: r.data, meta: r.meta });
}

// Body { stock_minimo }: entero >= 0 (0 = sin alerta). Número JSON, no texto.
async function actualizarStockMinimo(req, res) {
  const valor = req.body ? req.body.stock_minimo : undefined;
  if (typeof valor !== 'number') {
    throw new AppError('VALIDATION_ERROR', 'stock_minimo debe ser numerico', 400, { campo: 'stock_minimo' });
  }
  const data = await servicio().actualizarStockMinimo(
    entero(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER), entero(valor, 'stock_minimo', 0, MAX_STOCK_MINIMO),
    { id: req.usuario.id, contexto: req.usuario.contexto }, req.ip
  );
  return res.json({ ok: true, data: data, meta: {} });
}

module.exports = { obtener, actualizarStockMinimo };
