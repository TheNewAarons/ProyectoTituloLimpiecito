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
router.patch('/ingresos/:id/anular', soloAdmin, require('./anular-codigo').rutaReemplazada('ingresos')); // AUT-029: anular pide código
router.patch('/ingresos/:id/revertir', soloAdmin, asyncHandler(controlador.revertirIngreso));

router.get('/egresos', soloAdmin, asyncHandler(controlador.listarEgresos));
router.patch('/egresos/:id/pagar', soloAdmin, asyncHandler(controlador.pagarEgreso));
router.patch('/egresos/:id/anular', soloAdmin, require('./anular-codigo').rutaReemplazada('egresos')); // AUT-029: anular pide código
router.patch('/egresos/:id/revertir', soloAdmin, asyncHandler(controlador.revertirEgreso));

// RNF-SEC-02 (retroalimentación): anular pide motivo y código por correo (ver anular-codigo.js).
const anularCodigo = require('./anular-codigo');
router.get('/ingresos/:id/anulable', soloAdmin, asyncHandler(anularCodigo.verificar('ingresos')));
router.get('/egresos/:id/anulable', soloAdmin, asyncHandler(anularCodigo.verificar('egresos')));
router.post('/ingresos/:id/anular/codigo', soloAdmin, asyncHandler(anularCodigo.pedirCodigo('ingresos')));
router.post('/ingresos/:id/anular', soloAdmin, asyncHandler(anularCodigo.anular('ingresos')));
router.post('/egresos/:id/anular/codigo', soloAdmin, asyncHandler(anularCodigo.pedirCodigo('egresos')));
router.post('/egresos/:id/anular', soloAdmin, asyncHandler(anularCodigo.anular('egresos')));

module.exports = router;
