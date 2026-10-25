/**
 * RF-BOD-01 — Router nuevo, montado SOLO bajo /api/v1/bodega (ver index.js). Permisos según spec §2.3:
 * crear = supervisor (propias) + Admin/Operaciones; gestión = Admin/Operaciones.
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

module.exports = router;
