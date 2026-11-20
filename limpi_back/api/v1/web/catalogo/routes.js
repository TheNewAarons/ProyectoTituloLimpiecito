/**
 * RF-WEB-01 — Router /api/v1/web/catalogo (solo Admin). La auth/autorización se monta en index.js.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../../middleware/errores');
const { subirImagen } = require('../../../../libs/multer_publicaciones');
const controlador = require('./controlador');

router.get('/', asyncHandler(controlador.listar));
router.patch('/orden', asyncHandler(controlador.reordenar));
// RF-WEB-01b: vínculo con la app de reservas (antes de '/:id' para que 'servicios-app' no se lea como id).
const appControlador = require('./app-controlador');
router.get('/servicios-app', asyncHandler(appControlador.listarServiciosApp));
router.post('/importar-servicio', asyncHandler(appControlador.importar));
router.put('/:id/servicio-app', asyncHandler(appControlador.vincular));
router.get('/:id', asyncHandler(controlador.obtener));
router.post('/', subirImagen('imagen'), asyncHandler(controlador.crear));
router.put('/:id', subirImagen('imagen'), asyncHandler(controlador.editar));
router.delete('/:id', asyncHandler(controlador.despublicar));

module.exports = router;
