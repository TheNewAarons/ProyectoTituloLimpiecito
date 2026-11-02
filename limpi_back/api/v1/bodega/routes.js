/**
 * Router de bodega, montado SOLO bajo /api/v1/bodega (ver index.js).
 * RF-BOD-01 (solicitudes): crear = supervisor (propias) + Admin/Operaciones; gestión = Admin/Operaciones (spec §2.3).
 * RF-BOD-03 (proveedores, órdenes de compra): Admin y Operaciones
 * (el rol "Operaciones" todavía no existe en la BD local: ver services/constantes.js).
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticarBodega, permitir } = require('../../../middleware/auth-bodega');
const { ROL_BODEGA_ADMIN_NOMBRES } = require('../../../services/bodega/constantes');
const controlador = require('./controlador');

const admin = [autenticarBodega, permitir({ roles: ROL_BODEGA_ADMIN_NOMBRES })];
const supervisorOAdmin = [autenticarBodega, permitir({ roles: ROL_BODEGA_ADMIN_NOMBRES, supervisor: true })];

router.get('/productos/solicitables', supervisorOAdmin, asyncHandler(controlador.productosSolicitables));
router.get('/centros-costo/permitidos', supervisorOAdmin, asyncHandler(controlador.centrosPermitidos));

// Rutas estáticas antes de /solicitudes/:id para que 'mias' no se lea como id.
router.get('/solicitudes/mias', supervisorOAdmin, asyncHandler(controlador.listarMias));
router.get('/solicitudes', admin, asyncHandler(controlador.listar));
router.post('/solicitudes', supervisorOAdmin, asyncHandler(controlador.crear));
router.get('/solicitudes/:id', supervisorOAdmin, asyncHandler(controlador.obtener));
router.patch('/solicitudes/:id/anular', supervisorOAdmin, asyncHandler(controlador.anular));
// Sin cambio de estado manual: PARCIAL/LISTA_ENTREGA los pone el cruce (RF-BOD-02) y ENTREGADA la entrega (RF-BOD-04).

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
