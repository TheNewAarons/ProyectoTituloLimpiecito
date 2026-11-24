/**
 * RF-WEB-02 / RF-010.2 (AUT-011) — PUT /api/v1/archivos/:id/archivo (Admin; sesión y rol los aplica index.js).
 * Reemplaza el PDF de un documento: la descarga pública y "Ver Documento" entregan la versión nueva. El archivo
 * anterior se conserva en disco y su ruta queda en la auditoría (reversible, D-WEB-02-R1).
 */
const fs = require('fs');
const db = require('../../../database/database');
const Documento = require('../../../modelos/sistema_base/Documento');
const AppError = require('../../../libs/app-error');
const { auditar } = require('../../../services/auditoria');
const { esPdf } = require('../../../services/archivo/firma-pdf');
const subida = require('../../../libs/multer_documentos');

const subirPdf = subida.single('pdf');

function recibir(req, res) {
  return new Promise((resolve, reject) => subirPdf(req, res, (err) => {
    if (!err) return resolve();
    if (err.code === 'LIMIT_FILE_SIZE') return reject(new AppError('ARCHIVO_DEMASIADO_GRANDE', 'El archivo supera los 25 MB', 400));
    return reject(new AppError('SUBIDA_INVALIDA', 'No se pudo recibir el archivo', 400));
  }));
}

const reemplazarArchivo = async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError('CAMPO_INVALIDO', 'id de documento inválido', 400, { id: req.params.id });
  }
  await recibir(req, res);
  const descartar = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
  try {
    if (!req.file) throw new AppError('ARCHIVO_REQUERIDO', 'Debe adjuntar un archivo PDF', 400, { campo: 'pdf' });
    if (!(await esPdf(req.file.path))) throw new AppError('ARCHIVO_NO_PDF', 'El archivo no es un PDF válido', 400, { campo: 'pdf' });
    const usuario = { id: req.usuario.id, contexto: req.usuario.contexto || 'usuarios' };
    const data = await db.sequelize.transaction(async (t) => {
      const documento = await Documento.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!documento) throw new AppError('NO_ENCONTRADO', 'El documento no existe', 404, { id: id });
      const anterior = documento.url;
      await documento.update({ url: req.file.path }, { transaction: t });
      await auditar({
        transaction: t, usuario: usuario, entidad: 'documentos', entidad_id: id, accion: 'REEMPLAZAR_ARCHIVO',
        antes: { url: anterior }, despues: { url: req.file.path }, ip: req.ip
      });
      return { id: id, nombre: documento.nombre };
    });
    return res.json({ ok: true, data: data, meta: {} });
  } catch (error) {
    descartar();
    throw error;
  }
};

module.exports = { reemplazarArchivo: reemplazarArchivo };
