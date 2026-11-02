/**
 * RF-BOD-03 — Router nuevo, montado SOLO bajo /api/v1/bodega (ver index.js). Admin y Operaciones
 * (el rol "Operaciones" todavía no existe en la BD local: ver services/constantes.js).
 * No existe aún middleware/auth-bodega ni un router bodega compartido (en rama de otro
 * integrante); este router es autocontenido para no pisar ese trabajo en curso.
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticar, requerirRol } = require('../../../middleware/auth');
const { ROL_ADMIN_NOMBRES, ROL_OPERACIONES_NOMBRES } = require('../../../services/constantes');
const proveedores = require('./proveedores-controlador');
const ordenesCompra = require('./ordenes-compra-controlador');

const ADMIN_Y_OPERACIONES = [autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES.concat(ROL_OPERACIONES_NOMBRES))];

router.get('/proveedores', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.listar));
router.get('/proveedores/:id', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.obtener));
router.post('/proveedores', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.crear));
router.patch('/proveedores/:id', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.editar));
router.delete('/proveedores/:id', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.desactivar));

router.get('/ordenes-compra/:id', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.obtener));
router.patch('/ordenes-compra/:id', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.actualizar));
router.post('/ordenes-compra/:id/enviar', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.enviar));

module.exports = router;
