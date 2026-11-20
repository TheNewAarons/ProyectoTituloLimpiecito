/**
 * RF-PEV-02c — Routers laborales montados ANTES del gate Admin de /api/v1/pev (ver index.js).
 * Cada router termina en noEncontrado para que una ruta inexistente responda 404 JSON y no caiga
 * en el autenticar + requerirRol(Admin) del gate.
 */

const express = require('express');

const { asyncHandler, noEncontrado } = require('../../../../middleware/errores');
const controlador = require('./controlador');

const trabajador = express.Router();
trabajador.get('/asignaciones', asyncHandler(controlador.listarAsignacionesTrabajador));
trabajador.patch('/lineas/:lineaId/pasos/:paso', asyncHandler(controlador.marcarPaso));
trabajador.use(noEncontrado);

const supervisor = express.Router();
supervisor.patch('/lineas/:lineaId/chequeos/:ronda', asyncHandler(controlador.chequear));
supervisor.patch('/lineas/:lineaId/observaciones', asyncHandler(controlador.observar));
supervisor.use(noEncontrado);

module.exports = {
  trabajador: trabajador,
  supervisor: supervisor
};
