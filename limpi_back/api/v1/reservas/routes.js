/**
 * RF-BI-05 — /api/v1/reservas (solo Admin): aprobar, rechazar (con motivo) y finalizar una reserva.
 * La autenticación y el rol se aplican en index.js al montar el router. Ver services/reservas/gestion.js.
 */
const express = require('express');
const { asyncHandler } = require('../../../middleware/errores');
const gestion = require('../../../services/reservas/gestion');

const router = express.Router();

const contexto = (req) => ({
  usuario: { id: req.usuario.id, contexto: req.usuario.contexto },
  ip: req.ip,
  motivo: req.body && req.body.motivo
});

['aprobar', 'rechazar', 'finalizar'].forEach((accion) => {
  router.post('/:id/' + accion, asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await gestion.cambiarEstado(accion, req.params.id, contexto(req)), meta: {} });
  }));
});

module.exports = router;
