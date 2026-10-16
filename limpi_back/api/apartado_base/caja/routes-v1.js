/**
 * RF-CAJA-01 — Router nuevo, montado SOLO bajo /api/v1/cajas (ver index.js). Solo Admin.
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticar, requerirRol } = require('../../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../../services/constantes');
const controlador = require('./controlador-v1');

const soloAdmin = [autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES)];

// Ruta estática antes de /:periodo/... para que 'historial' no se interprete como periodo.
router.get('/historial', soloAdmin, asyncHandler(controlador.historial));
router.get('/:periodo/resumen', soloAdmin, asyncHandler(controlador.resumen));
router.post('/:periodo/cerrar', soloAdmin, asyncHandler(controlador.cerrar));
router.post('/:periodo/reabrir', soloAdmin, asyncHandler(controlador.reabrir));

module.exports = router;
