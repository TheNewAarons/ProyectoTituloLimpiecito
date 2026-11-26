/**
 * RNF-SEC-02 — Router de consulta de auditoría (solo lectura), montado SOLO bajo /api/v1/auditoria
 * (ver index.js: autenticar + requerirRol(Admin) se aplican a nivel de app.use del path).
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const controlador = require('./controlador');

router.get('/', asyncHandler(controlador.listar));
// Botón "Historial" del ERP (revisión de requerimientos); antes de '/:id' para que no lo capture.
router.get('/historial', asyncHandler(require('./historial').historial));
router.get('/:id', asyncHandler(controlador.obtener));

module.exports = router;
