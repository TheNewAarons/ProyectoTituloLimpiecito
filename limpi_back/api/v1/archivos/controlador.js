/**
 * RF-WEB-02 — Capa HTTP de /api/v1/archivos. Publica/despublica un documento como PDF descargable.
 * La validación pura del archivo vive en services/archivo/documento-publico.js.
 */

const Documento = require('../../../modelos/sistema_base/Documento');
const AppError = require('../../../libs/app-error');
const { validarPdf, resolverRutaSegura } = require('../../../services/archivo/documento-publico');

// Respuesta sin `url` (nunca se expone la ruta interna).
const CAMPOS_RESPUESTA = ['id', 'nombre', 'fecha_subida', 'estado', 'publico', 'fecha_publicacion', 'categoriaDocumentoId'];

function parsearId(texto) {
  if (typeof texto !== 'string' || !/^\d+$/.test(texto) || Number(texto) < 1) {
    throw new AppError('VALIDATION_ERROR', 'id debe ser un entero mayor que 0', 400, { campo: 'id' });
  }
  return Number(texto);
}

function aRespuesta(doc) {
  const r = {};
  CAMPOS_RESPUESTA.forEach(function (c) { r[c] = doc[c]; });
  return r;
}

const publicar = async (req, res) => {
  const id = parsearId(req.params.id);
  const publico = req.body && req.body.publico;
  if (typeof publico !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'publico debe ser booleano', 400, { campo: 'publico' });
  }

  const documento = await Documento.findById(id);
  if (!documento) throw new AppError('NOT_FOUND', 'Documento no encontrado', 404);

  // Valida antes de escribir en BD; si la ruta no es segura, responde igual que un archivo ausente.
  if (publico) {
    const ruta = resolverRutaSegura(documento.url);
    if (!ruta) throw new AppError('ARCHIVO_NO_ENCONTRADO', 'El archivo no existe', 422);
    await validarPdf(ruta);
  }

  const actualizacion = { publico: publico };
  // Conserva la fecha de publicación original si ya estaba publicado; solo se fija al pasar false -> true.
  if (publico && !documento.publico) actualizacion.fecha_publicacion = new Date();
  await documento.update(actualizacion);

  return res.json({ ok: true, data: aRespuesta(documento.get({ plain: true })), meta: {} });
};

module.exports = { publicar: publicar };
