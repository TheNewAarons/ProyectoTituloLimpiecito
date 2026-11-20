/**
 * RF-PEV-01 — Router /api/v1/pev/asignaciones-masivas (solo Admin). La auth se monta en index.js.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../../middleware/errores');
const controlador = require('./controlador');

router.get('/opciones', asyncHandler(controlador.opciones));
router.post('/vista-previa', asyncHandler(controlador.previsualizar));
router.post('/', asyncHandler(controlador.ejecutar));

module.exports = router;
