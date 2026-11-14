/**
 * RF-WEB-03 — Router /api/v1/web/publicaciones (solo Admin). La auth/autorización se monta en index.js.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../../middleware/errores');
const { subirImagen } = require('../../../../libs/multer_publicaciones');
const controlador = require('./controlador');

router.get('/', asyncHandler(controlador.listar));
router.get('/:id', asyncHandler(controlador.obtener));
router.post('/', subirImagen('imagen'), asyncHandler(controlador.crear));
router.put('/:id', subirImagen('imagen'), asyncHandler(controlador.editar));
router.delete('/:id', asyncHandler(controlador.despublicar));

module.exports = router;
