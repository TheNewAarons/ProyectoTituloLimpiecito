/**
 * RF-FAC-01 — Router nuevo, montado SOLO bajo /api/v1 (ver index.js): /ingresos, /egresos,
 * /facturas/resumen. Solo Admin (igual que RF-CAJA-01/02).
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticar, requerirRol } = require('../../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../../services/constantes');
const controlador = require('./controlador');

const soloAdmin = [autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES)];

router.get('/facturas/resumen', soloAdmin, asyncHandler(controlador.resumen));

router.get('/ingresos', soloAdmin, asyncHandler(controlador.listarIngresos));
router.patch('/ingresos/:id/pagar', soloAdmin, asyncHandler(controlador.pagarIngreso));
router.patch('/ingresos/:id/anular', soloAdmin, asyncHandler(controlador.anularIngreso));
router.patch('/ingresos/:id/revertir', soloAdmin, asyncHandler(controlador.revertirIngreso));

router.get('/egresos', soloAdmin, asyncHandler(controlador.listarEgresos));
router.patch('/egresos/:id/pagar', soloAdmin, asyncHandler(controlador.pagarEgreso));
router.patch('/egresos/:id/anular', soloAdmin, asyncHandler(controlador.anularEgreso));
router.patch('/egresos/:id/revertir', soloAdmin, asyncHandler(controlador.revertirEgreso));

module.exports = router;
