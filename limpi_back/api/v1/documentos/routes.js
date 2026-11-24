/**
 * RNF-SEC-01 (AUT-015, obs. 18) — GET /api/v1/documentos/:id/contenido: entrega el PDF de un documento interno con sesión.
 * Reemplaza el acceso directo por /uploads y /documento/descargar-pdf (sin sesión) para "Ver Documento" y "Descargar" del ERP.
 * Autenticación y rol (Administrador; LVL_ARCHIVO si existe) se aplican en index.js.
 */
const express = require('express');
const router = express.Router();
const Documento = require('../../../modelos/sistema_base/Documento');
const AppError = require('../../../libs/app-error');
const { asyncHandler } = require('../../../middleware/errores');
const { resolverRutaSegura, nombreDescarga } = require('../../../services/archivo/documento-publico');

router.get('/:id/contenido', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'id de documento inválido', 400, { id: req.params.id });
  }
  const documento = await Documento.findById(id, { attributes: ['id', 'nombre', 'url'] });
  if (!documento) throw new AppError('NO_ENCONTRADO', 'El documento no existe', 404, { id: id });
  const ruta = resolverRutaSegura(documento.url);
  if (!ruta) throw new AppError('ARCHIVO_NO_DISPONIBLE', 'El archivo del documento no está disponible', 404, { id: id });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + nombreDescarga(documento.nombre) + '"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(ruta);
}));

module.exports = router;
