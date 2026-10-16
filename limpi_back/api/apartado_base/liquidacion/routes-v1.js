/**
 * RF-CAJA-02 — Router nuevo, montado SOLO bajo /api/v1/liquidaciones (ver index.js). No convive
 * con el router legacy (./routes.js, montado en /liquidacion dentro de `api` y expuesto tanto en
 * el prefijo legacy como en el alias /api/v1 por RNF-API-01).
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticar, requerirRol } = require('../../../middleware/auth');
const { ROL_ADMIN_NOMBRES, ROL_RRHH_NOMBRES } = require('../../../services/constantes');
const controlador = require('./controlador-v1');

const ADMIN_Y_RRHH = ROL_ADMIN_NOMBRES.concat(ROL_RRHH_NOMBRES);

// Antes de /:id/... para que no se confunda con un id de liquidación (requisito del requerimiento).
router.get('/pendientes-resumen', autenticar, requerirRol.apply(null, ADMIN_Y_RRHH), asyncHandler(controlador.pendientesResumen));

router.get('/', autenticar, requerirRol.apply(null, ADMIN_Y_RRHH), asyncHandler(controlador.listar));

router.post('/pagar-lote', autenticar, requerirRol.apply(null, ADMIN_Y_RRHH), asyncHandler(controlador.pagarLote));

router.patch('/:id/pagar', autenticar, requerirRol.apply(null, ADMIN_Y_RRHH), asyncHandler(controlador.pagar));

// Solo Admin: la matriz de permisos (spec §2.3) no habilita a RRHH para revertir pagos.
router.patch('/:id/revertir-pago', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), asyncHandler(controlador.revertirPago));

module.exports = router;
