/**
 * RF-WEB-03 — Lógica pura de publicaciones (sin express ni modelos): sanitización, validación y
 * proyección a público. Los errores de validación se emiten como AppError con httpStatus 400.
 */

const sanitizeHtml = require('sanitize-html');
const Sequelize = require('sequelize');
const AppError = require('../../libs/app-error');

const Op = Sequelize.Op;

const LIMITE_TITULO = 150;
const LIMITE_CUERPO = 20000;

// Solo `href` es atributo de entrada de <a>; `rel`/`target` se agregan en transformTags y deben
// listarse aquí para no ser descartados por el filtro de atributos (transformTags corre antes).
const OPCIONES_CUERPO = {
  allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'blockquote'],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
  // script/style/iframe se eliminan junto con su contenido (se conserva textarea/option del default).
  nonTextTags: ['script', 'style', 'iframe', 'textarea', 'option'],
  transformTags: {
    a: function (tagName, attribs) {
      const salida = {};
      // No emitir href: undefined: naughtyHref haría href.replace sobre un valor no string.
      if (attribs && typeof attribs.href === 'string' && attribs.href !== '') salida.href = attribs.href;
      salida.rel = 'noopener noreferrer';
      salida.target = '_blank';
      return { tagName: 'a', attribs: salida };
    }
  }
};

/**
 * Sanea el cuerpo HTML: deja solo las etiquetas/atributos permitidos y enlaces seguros.
 * @param {string} html
 * @returns {string}
 */
function sanitizarCuerpo(html) {
  if (html === null || html === undefined) return '';
  return sanitizeHtml(String(html), OPCIONES_CUERPO);
}

/**
 * Sanea un título: elimina todo HTML y recorta.
 * @param {string} txt
 * @returns {string}
 */
function sanitizarTitulo(txt) {
  if (txt === null || txt === undefined) return '';
  return sanitizeHtml(String(txt), { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'discard' }).trim();
}

function esFechaValida(v) {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === 'string' && v.trim() !== '') return !isNaN(new Date(v).getTime());
  return false;
}

function presente(body, k) {
  return Object.prototype.hasOwnProperty.call(body, k);
}

/**
 * Valida y limpia los campos de una publicación. Lanza AppError(VALIDATION_ERROR, 400) con un
 * `details` por campo si algo falla. En edición parcial compara la expiración contra el valor
 * FINAL de fecha_publicacion (nuevo si viene, si no el existente).
 * @param {object} body
 * @param {{parcial?: boolean, existente?: object}} opciones
 * @returns {object} campos limpios listos para create/update
 */
function validarPayload(body, opciones) {
  const o = opciones || {};
  const parcial = !!o.parcial;
  const existente = o.existente || null;
  const fuente = body || {};
  const errores = {};
  const limpio = {};

  if (presente(fuente, 'titulo') || !parcial) {
    const titulo = sanitizarTitulo(fuente.titulo);
    if (!titulo) errores.titulo = 'titulo debe tener entre 1 y 150 caracteres';
    else if (titulo.length > LIMITE_TITULO) errores.titulo = 'titulo supera 150 caracteres';
    else limpio.titulo = titulo;
  }

  if (presente(fuente, 'cuerpo') || !parcial) {
    const cuerpo = sanitizarCuerpo(fuente.cuerpo);
    // Vacío = sin texto visible; "<p></p>" no cuenta como contenido.
    if (!sanitizarTitulo(cuerpo)) errores.cuerpo = 'cuerpo no puede quedar vacío';
    else if (cuerpo.length > LIMITE_CUERPO) errores.cuerpo = 'cuerpo supera 20000 caracteres';
    else limpio.cuerpo = cuerpo;
  }

  let publicacionFinal = existente ? existente.fecha_publicacion : null;
  if (presente(fuente, 'fecha_publicacion') || !parcial) {
    if (!esFechaValida(fuente.fecha_publicacion)) {
      errores.fecha_publicacion = 'fecha_publicacion debe ser una fecha ISO válida';
    } else {
      publicacionFinal = new Date(fuente.fecha_publicacion);
      limpio.fecha_publicacion = publicacionFinal;
    }
  }

  if (presente(fuente, 'fecha_expiracion')) {
    const v = fuente.fecha_expiracion;
    if (v === null || v === '') {
      limpio.fecha_expiracion = null;
    } else if (!esFechaValida(v)) {
      errores.fecha_expiracion = 'fecha_expiracion debe ser una fecha ISO válida';
    } else {
      const expiracion = new Date(v);
      if (publicacionFinal && expiracion.getTime() <= new Date(publicacionFinal).getTime()) {
        errores.fecha_expiracion = 'fecha_expiracion debe ser posterior a fecha_publicacion';
      } else {
        limpio.fecha_expiracion = expiracion;
      }
    }
  } else if (limpio.fecha_publicacion && existente && existente.fecha_expiracion &&
    new Date(existente.fecha_expiracion).getTime() <= limpio.fecha_publicacion.getTime()) {
    // Mover solo la publicación más allá de la expiración guardada también es inválido.
    errores.fecha_expiracion = 'fecha_expiracion debe ser posterior a fecha_publicacion';
  }

  if (presente(fuente, 'publicado')) {
    const p = fuente.publicado;
    if (p === true || p === 'true') limpio.publicado = true;
    else if (p === false || p === 'false') limpio.publicado = false;
    else errores.publicado = 'publicado debe ser booleano (true/false)';
  } else if (!parcial) {
    limpio.publicado = false;
  }

  if (Object.keys(errores).length) {
    throw new AppError('VALIDATION_ERROR', 'Datos inválidos', 400, errores);
  }
  return limpio;
}

/**
 * Where de Sequelize para las publicaciones vigentes en `ahora` (publicado y dentro de fechas).
 * @param {Date} ahora
 * @returns {object}
 */
function filtroVigentes(ahora) {
  return {
    publicado: true,
    fecha_publicacion: { [Op.lte]: ahora },
    [Op.or]: [
      { fecha_expiracion: null },
      { fecha_expiracion: { [Op.gt]: ahora } }
    ]
  };
}

/**
 * Misma regla de vigencia que filtroVigentes, en JS (para el campo `vigente` del listado admin).
 * @param {object} p publicación (instancia o plain object)
 * @param {Date} ahora
 * @returns {boolean}
 */
function esVigente(p, ahora) {
  const plana = p && p.get ? p.get({ plain: true }) : p;
  const t = ahora ? new Date(ahora).getTime() : Date.now();
  const publicacion = new Date(plana.fecha_publicacion).getTime();
  const expiracion = plana.fecha_expiracion === null || plana.fecha_expiracion === undefined
    ? null : new Date(plana.fecha_expiracion).getTime();
  return plana.publicado === true && publicacion <= t && (expiracion === null || expiracion > t);
}

/**
 * Proyección pública: nunca expone rutas internas, solo la URL del archivo servido.
 * @param {object} p
 * @returns {{id:number, titulo:string, cuerpo:string, imagen_url:(string|null), fecha_publicacion:Date, fecha_expiracion:(Date|null)}}
 */
function aPublico(p) {
  const plana = p && p.get ? p.get({ plain: true }) : p;
  const prefijo = process.env.PREFIJO || '';
  return {
    id: plana.id,
    titulo: plana.titulo,
    cuerpo: plana.cuerpo,
    imagen_url: plana.imagen ? prefijo + '/uploads_limpiecitoweb/publicaciones/' + plana.imagen : null,
    fecha_publicacion: plana.fecha_publicacion,
    fecha_expiracion: plana.fecha_expiracion
  };
}

module.exports = {
  sanitizarCuerpo: sanitizarCuerpo,
  sanitizarTitulo: sanitizarTitulo,
  validarPayload: validarPayload,
  filtroVigentes: filtroVigentes,
  esVigente: esVigente,
  aPublico: aPublico
};
