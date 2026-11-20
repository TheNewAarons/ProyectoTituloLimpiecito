/**
 * RF-WEB-02 — Router público /api/v1/public (sin auth), con rate limit por IP en memoria.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { crearLimitePorIp } = require('../../../middleware/rate-limit');
const controlador = require('./controlador');

router.use(crearLimitePorIp());

router.get('/documentos', asyncHandler(controlador.listar));
router.get('/documentos/:id/descargar', asyncHandler(controlador.descargar));
router.get('/publicaciones', asyncHandler(controlador.listarPublicaciones));
// RF-WEB-01: carga diferida (el modelo nuevo no está simulado en los tests de RF-WEB-02/03).
router.get('/catalogo', asyncHandler((req, res) => require('./catalogo').listarCatalogo(req, res)));
// RNF-ARQ-01 parte 1 (SCRUM-42): equivalente de POST /contactanos_web/contactanos.
// Cada envío manda un correo: límite propio más estricto (5 cada 10 min por IP) además del general.
router.post('/contacto', crearLimitePorIp({ ventanaMs: 10 * 60 * 1000, max: 5 }), asyncHandler(require('./contacto').enviar));

module.exports = router;
