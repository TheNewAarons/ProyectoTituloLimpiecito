/**
 * RF-WEB-03 / obs. 23 (AUT-019) — PUT /api/v1/web/anuncios/:id/imagen (Admin; sesión y rol los aplica index.js).
 * Reemplaza la imagen del anuncio legacy (la ruta antigua de editar solo cambia textos). Valida tipo y contenido
 * (jpg/png/webp, 5 MB) con libs/multer_publicaciones. La imagen anterior se conserva en disco y queda en la
 * auditoría (reversible, mismo criterio que el reemplazo de documentos, D-WEB-02-R1).
 */
const express = require('express');
const db = require('../../../../database/database');
const Anuncio = require('../../../../modelos/sistema_web/Anuncio');
const AppError = require('../../../../libs/app-error');
const { asyncHandler } = require('../../../../middleware/errores');
const { auditar } = require('../../../../services/auditoria');
const { subirImagen, validarMagicBytes, borrarImagen } = require('../../../../libs/multer_publicaciones');

// Ruta relativa como la guarda el legacy (el front la antepone a url_short); servida por el estático de index.js.
const RUTA_PUBLICA = 'uploads_limpiecitoweb/publicaciones/';

const reemplazarImagen = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
      throw new AppError('CAMPO_INVALIDO', 'id de anuncio inválido', 400, { id: req.params.id });
    }
    if (!req.file) throw new AppError('IMAGEN_REQUERIDA', 'Debe adjuntar una imagen (jpg, png o webp)', 400, { campo: 'imagen' });
    await validarMagicBytes(req.file.path);
    const nueva = RUTA_PUBLICA + req.file.filename;
    const usuario = { id: req.usuario.id, contexto: req.usuario.contexto || 'usuarios' };
    const data = await db.sequelize.transaction(async (t) => {
      const anuncio = await Anuncio.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!anuncio) throw new AppError('NO_ENCONTRADO', 'El anuncio no existe', 404, { id: id });
      const anterior = anuncio.imagen;
      await anuncio.update({ imagen: nueva }, { transaction: t });
      await auditar({
        transaction: t, usuario: usuario, entidad: 'anuncios', entidad_id: id, accion: 'REEMPLAZAR_IMAGEN',
        antes: { imagen: anterior }, despues: { imagen: nueva }, ip: req.ip
      });
      return { id: id, imagen: nueva };
    });
    return res.json({ ok: true, data: data, meta: {} });
  } catch (error) {
    if (req.file) borrarImagen(req.file.filename);
    throw error;
  }
};

const router = express.Router();
router.put('/:id/imagen', subirImagen('imagen'), asyncHandler(reemplazarImagen));

module.exports = router;
module.exports.reemplazarImagen = reemplazarImagen;
