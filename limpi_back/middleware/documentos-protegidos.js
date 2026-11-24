/**
 * RNF-SEC-01 (AUT-015, obs. 18 de las pruebas web) — Filtro delante del estático /web-limpiecito/uploads.
 * `uploads/` mezcla imágenes públicas de la app de reservas (subcarpetas) con documentos internos (archivos en la raíz,
 * que sube /documento/crear, y uploads/documentos/ de la carga antigua). Los documentos internos ya no se sirven por esta
 * vía: el ERP los pide con sesión a GET /api/v1/documentos/:id/contenido. Siguen abiertos:
 *  - las subcarpetas de imágenes de la app (SUBCARPETAS_PUBLICAS);
 *  - los documentos marcados como públicos (por si un sitio externo los enlaza por su ruta).
 * Todo lo demás responde 404 (denegar por defecto), igual que un archivo inexistente.
 */
const path = require('path');
const Documento = require('../modelos/sistema_base/Documento');

const SUBCARPETAS_PUBLICAS = ['servicios', 'categoria_servicios', 'cate-extra', 'instructivos'];

/** Variantes con que puede estar guardada la ruta en documentos.url (Windows guarda "\"). */
function variantesUrl(relativa) {
  const conBarra = 'uploads/' + relativa;
  return [conBarra, conBarra.replace(/\//g, '\\')];
}

async function documentosProtegidos(req, res, next) {
  let relativa;
  try {
    // Normaliza "\" y "..": "/servicios/../doc.pdf" no puede pasar como imagen de la app y terminar sirviendo un documento.
    relativa = path.posix.normalize(decodeURIComponent(req.path).replace(/\\/g, '/')).replace(/^\/+/, '');
  } catch (e) {
    return res.status(404).end();
  }
  if (relativa === '' || relativa === '.' || relativa.split('/').indexOf('..') !== -1) return res.status(404).end();
  const primera = relativa.split('/')[0];
  if (relativa.indexOf('/') !== -1 && SUBCARPETAS_PUBLICAS.indexOf(primera) !== -1) return next();
  try {
    const variantes = variantesUrl(relativa);
    const encontrados = await Documento.findAll({ where: { url: variantes }, attributes: ['id', 'publico', 'url'] });
    // La collation de MySQL ignora mayúsculas y espacios finales: se exige coincidencia exacta y que TODAS sean públicas.
    const exactos = encontrados.filter((d) => variantes.indexOf(d.url) !== -1);
    if (exactos.length && exactos.every((d) => d.publico)) return next();
  } catch (e) {
    // Ante un error de BD se deniega (no se expone el archivo).
  }
  return res.status(404).end();
}

module.exports = documentosProtegidos;
module.exports.SUBCARPETAS_PUBLICAS = SUBCARPETAS_PUBLICAS;
module.exports.variantesUrl = variantesUrl;
