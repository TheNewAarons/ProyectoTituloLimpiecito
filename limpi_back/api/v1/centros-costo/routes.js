/**
 * Reabrir un centro de costo cerrado por error. Montado SOLO bajo /api/v1/centros-costo (ver index.js).
 * Solo Admin (igual que reabrir la caja del mes); cerrar lo siguen haciendo los 4 roles.
 * Dos pasos: POST /:id/reabrir/codigo { motivo } (envía código y motivo al correo) y POST /:id/reabrir { codigo }. Auditado.
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticar, requerirRol } = require('../../../middleware/auth');
const AppError = require('../../../libs/app-error');
const { reabrirCentroCosto, verificarReabrible } = require('../../../services/centro-costo/cierre');
const { emitirCodigo, consumirCodigo } = require('../../../services/centro-costo/codigo-reapertura');
const Usuario = require('../../../modelos/sistema_base/Usuario');

const { ROL_ADMIN_NOMBRES } = require('../../../services/constantes');
const MOTIVO_MIN = 5;
const MOTIVO_MAX = 500;

const leerId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('ID_INVALIDO', 'id inválido', 400);
  return id;
};

const leerMotivo = (req) => {
  const motivo = req.body && typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < MOTIVO_MIN || motivo.length > MOTIVO_MAX) {
    throw new AppError('MOTIVO_REQUERIDO', 'motivo obligatorio (entre ' + MOTIVO_MIN + ' y ' + MOTIVO_MAX + ' caracteres)', 400);
  }
  return motivo;
};

// Paso 1: motivo -> envía el código al correo del usuario con sesión (leído de la BD, no del token, por si cambió).
async function pedirCodigo(req, res) {
  const id = leerId(req);
  const motivo = leerMotivo(req);
  const centro = await verificarReabrible(id);
  const usuario = await Usuario.findById(req.usuario.id, { attributes: ['id', 'nombre', 'correo'] });
  const envio = await emitirCodigo(
    { id: req.usuario.id, nombre: usuario && usuario.nombre, correo: usuario && usuario.correo }, centro, motivo
  );
  return res.json({ ok: true, data: envio, meta: {} });
}

// Paso 2: código. Se consume antes de tocar la BD; el motivo auditado es el que llegó en el correo.
async function reabrir(req, res) {
  const id = leerId(req);
  const motivo = consumirCodigo(req.usuario.id, id, req.body && req.body.codigo);
  const centro = await reabrirCentroCosto(id, {
    usuario: { id: req.usuario.id, contexto: req.usuario.contexto },
    motivo: motivo + ' [confirmado con código por correo]',
    ip: req.ip
  });
  return res.json({ ok: true, data: { centro: centro }, meta: {} });
}

router.post('/:id/reabrir/codigo', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), asyncHandler(pedirCodigo));
router.post('/:id/reabrir', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), asyncHandler(reabrir));

module.exports = router;
module.exports.reabrir = reabrir;
module.exports.pedirCodigo = pedirCodigo;
