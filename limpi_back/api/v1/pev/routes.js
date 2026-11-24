/**
 * RF-PEV-02a — Router de actividades y asignaciones PEV, montado SOLO bajo /api/v1/pev
 * (ver index.js: autenticar + requerirRol(Admin) se aplican a nivel de app.use del path).
 * Sin verbo DELETE: cae en el 404 JSON de /api/v1.
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const controlador = require('./controlador');

router.get('/actividades', asyncHandler(controlador.listarActividades));
router.post('/actividades', asyncHandler(controlador.crearActividad));

router.get('/asignaciones', asyncHandler(controlador.listarAsignaciones));
router.post('/asignaciones', asyncHandler(controlador.crearAsignacion));
router.patch('/asignaciones/:id/cerrar', asyncHandler(controlador.cerrarAsignacion));
router.patch('/asignaciones/:id/anular', asyncHandler(controlador.anularAsignacion));
router.get('/asignaciones/:id/cumplimiento', asyncHandler(controlador.verCumplimiento));
// RF-PEV-02 (AUT-016, obs. 12): asignaciones vigentes en el mes de un cronograma (panel de Ver Cronograma).
router.get('/cronogramas/:id/asignaciones', asyncHandler(require('./cronograma-controlador').asignacionesDelCronograma));

module.exports = router;
