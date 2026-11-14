/**
 * RF-WEB-03 — Capa HTTP de /api/v1/web/publicaciones (solo Admin). La lógica pura vive en
 * services/web/publicacion.js; la subida/validación de imagen en libs/multer_publicaciones.js.
 */

const Publicacion = require('../../../../modelos/sistema_web/Publicacion');
const AppError = require('../../../../libs/app-error');
const servicio = require('../../../../services/web/publicacion');
const { validarMagicBytes, borrarImagen } = require('../../../../libs/multer_publicaciones');

function parsearId(texto) {
  if (typeof texto !== 'string' || !/^\d+$/.test(texto) || Number(texto) < 1) {
    throw new AppError('VALIDATION_ERROR', 'id debe ser un entero mayor que 0', 400, { campo: 'id' });
  }
  return Number(texto);
}

function aAdmin(p) {
  const publico = servicio.aPublico(p);
  return Object.assign(publico, {
    publicado: !!p.publicado,
    vigente: servicio.esVigente(p, new Date())
  });
}

const listar = async (req, res) => {
  const filas = await Publicacion.findAll({ order: [['fecha_publicacion', 'DESC']] });
  res.json({ ok: true, data: filas.map(aAdmin), meta: { total: filas.length } });
};

const obtener = async (req, res) => {
  const id = parsearId(req.params.id);
  const p = await Publicacion.findById(id);
  if (!p) throw new AppError('NOT_FOUND', 'Publicación no encontrada', 404);
  res.json({ ok: true, data: aAdmin(p), meta: {} });
};

const crear = async (req, res) => {
  try {
    const campos = servicio.validarPayload(req.body || {}, { parcial: false });
    if (req.file) {
      await validarMagicBytes(req.file.path);
      campos.imagen = req.file.filename;
    }
    const p = await Publicacion.create(campos);
    res.status(201).json({ ok: true, data: aAdmin(p), meta: {} });
  } catch (e) {
    if (req.file) borrarImagen(req.file.filename);
    throw e;
  }
};

const editar = async (req, res) => {
  try {
    const id = parsearId(req.params.id);
    const p = await Publicacion.findById(id);
    if (!p) throw new AppError('NOT_FOUND', 'Publicación no encontrada', 404);

    const campos = servicio.validarPayload(req.body || {}, { parcial: true, existente: p });
    const imagenAnterior = p.imagen;

    if (req.file) {
      await validarMagicBytes(req.file.path);
      campos.imagen = req.file.filename;
    } else if (req.body && (req.body.quitar_imagen === true || req.body.quitar_imagen === 'true')) {
      campos.imagen = null;
    }

    await p.update(campos);

    // Reemplazo o quita: borra la anterior solo después de guardar con éxito (best effort).
    if ((req.file || campos.imagen === null) && imagenAnterior) borrarImagen(imagenAnterior);

    res.json({ ok: true, data: aAdmin(p), meta: {} });
  } catch (e) {
    if (req.file) borrarImagen(req.file.filename);
    throw e;
  }
};

const despublicar = async (req, res) => {
  const id = parsearId(req.params.id);
  const p = await Publicacion.findById(id);
  if (!p) throw new AppError('NOT_FOUND', 'Publicación no encontrada', 404);
  await p.update({ publicado: false });
  res.json({ ok: true, data: aAdmin(p), meta: {} });
};

module.exports = { listar: listar, obtener: obtener, crear: crear, editar: editar, despublicar: despublicar };
