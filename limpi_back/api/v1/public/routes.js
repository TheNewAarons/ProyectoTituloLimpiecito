/**
 * RF-WEB-02 — Router público /api/v1/public (sin auth), con rate limit por IP en memoria.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { crearLimitePorIp } = require('../../../middleware/rate-limit');
const controlador = require('./controlador');

router.use(crearLimitePorIp());

router.get('/documentos', asyncHandler(controlador.listar));
router.get('/documentos/:id/descargar', asyncHandler(controlador.descargar));

module.exports = router;
