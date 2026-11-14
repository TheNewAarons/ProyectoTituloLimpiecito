/**
 * RF-WEB-02 — Capa HTTP pública de /api/v1/public. Solo expone documentos `publico = true` y nunca la url.
 */

const Documento = require('../../../modelos/sistema_base/Documento');
const Categoria = require('../../../modelos/sistema_base/Categoria');
const Publicacion = require('../../../modelos/sistema_web/Publicacion');
const AppError = require('../../../libs/app-error');
const { validarPdf, resolverRutaSegura, nombreDescarga } = require('../../../services/archivo/documento-publico');
const publicacionServicio = require('../../../services/web/publicacion');

// Mismo error para id inválido, documento inexistente/no público y archivo inválido: no revela el motivo.
const noEncontrado = () => new AppError('NOT_FOUND', 'Documento no encontrado', 404);

function idValido(texto) {
  return typeof texto === 'string' && /^\d+$/.test(texto) && Number(texto) >= 1;
}

const listar = async (req, res) => {
  // Sin filtro por `estado`: el listado legacy (GET /documento/obtener-documentos) no lo usa para la visibilidad.
  const docs = await Documento.findAll({ where: { publico: true }, order: [['fecha_publicacion', 'DESC']] });

  const ids = Array.from(new Set(docs.map(function (d) { return d.categoriaDocumentoId; }).filter(function (v) { return v !== null && v !== undefined; })));
  const categorias = ids.length ? await Categoria.findAll({ where: { id: ids } }) : [];
  const nombrePorId = {};
  categorias.forEach(function (c) { nombrePorId[c.id] = c.nombre; });

  const data = docs.map(function (d) {
    return {
      id: d.id,
      titulo: d.nombre,
      categoria: d.categoriaDocumentoId !== null && d.categoriaDocumentoId !== undefined ? (nombrePorId[d.categoriaDocumentoId] || null) : null,
      fecha_publicacion: d.fecha_publicacion
    };
  });

  return res.json({ ok: true, data: data, meta: { total: data.length } });
};

const descargar = async (req, res, next) => {
  if (!idValido(req.params.id)) throw noEncontrado();

  const documento = await Documento.findById(Number(req.params.id));
  if (!documento || !documento.publico) throw noEncontrado();

  const ruta = resolverRutaSegura(documento.url);
  if (!ruta) throw noEncontrado();
  try {
    await validarPdf(ruta);
  } catch (e) {
    throw noEncontrado();
  }

  res.download(ruta, nombreDescarga(documento.nombre), function (err) {
    if (err && !res.headersSent) return next(err);
  });
};

const listarPublicaciones = async (req, res) => {
  const filas = await Publicacion.findAll({
    where: publicacionServicio.filtroVigentes(new Date()),
    order: [['fecha_publicacion', 'DESC']]
  });
  return res.json({ ok: true, data: filas.map(publicacionServicio.aPublico), meta: { total: filas.length } });
};

module.exports = { listar: listar, descargar: descargar, listarPublicaciones: listarPublicaciones };
