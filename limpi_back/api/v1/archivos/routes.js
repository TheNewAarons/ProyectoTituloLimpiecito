/**
 * RF-WEB-02 — Router /api/v1/archivos (solo Admin). La autenticación/autorización se monta en index.js.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const controlador = require('./controlador');

router.patch('/:id/publicar', asyncHandler(controlador.publicar));
// RF-010.2 (AUT-011): reemplazar el PDF de un documento (Admin, como el resto de este router).
router.put('/:id/archivo', asyncHandler(require('./reemplazo').reemplazarArchivo));

module.exports = router;
