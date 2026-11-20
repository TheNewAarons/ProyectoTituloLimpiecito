/**
 * RF-WEB-01 — Lógica pura del catálogo web (sin express ni modelos): validación y proyección pública.
 * Todos los textos se guardan sin HTML (la vista escapa). Errores de validación: AppError 400.
 */

const AppError = require('../../libs/app-error');
const { sanitizarTitulo: textoPlano } = require('./publicacion');

const LIMITES = { nombre: 150, descripcion: 2000, categoria: 80 };
const PRECIO_MAX = 99999999999999; // DECIMAL(14,0)
const MAX_IDS_ORDEN = 500;

// Texto plano real: quita etiquetas y deshace las entidades que deja sanitize-html (`a < b` no debe quedar `a &lt; b`).
// Si al decodificar aparece una etiqueta (p. ej. `&lt;script&gt;` escrito a propósito), se devuelve null y se rechaza.
function textoLimpio(v) {
  const t = textoPlano(v).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return /<[a-zA-Z!/?]/.test(t) ? null : t;
}

const presente = (body, k) => Object.prototype.hasOwnProperty.call(body, k);
const entero = (v) => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v.trim()))) && Number.isInteger(Number(v));

/**
 * Valida y limpia los campos de un ítem. En edición parcial solo valida lo que viene.
 * @param {object} body
 * @param {{parcial?: boolean}} opciones
 * @returns {object} campos listos para create/update
 */
function validarPayload(body, opciones) {
  const parcial = !!(opciones && opciones.parcial);
  const fuente = body || {};
  const errores = {};
  const limpio = {};

  if (presente(fuente, 'nombre') || !parcial) {
    const bruto = fuente.nombre === null || fuente.nombre === undefined ? '' : String(fuente.nombre);
    const nombre = bruto.length > LIMITES.nombre * 5 ? undefined : textoLimpio(bruto);
    if (nombre === undefined) errores.nombre = 'nombre supera 150 caracteres';
    else if (nombre === null) errores.nombre = 'nombre no puede contener etiquetas HTML';
    else if (!nombre) errores.nombre = 'nombre es obligatorio';
    else if (nombre.length > LIMITES.nombre) errores.nombre = 'nombre supera 150 caracteres';
    else limpio.nombre = nombre;
  }

  ['descripcion', 'categoria'].forEach(function (campo) {
    if (!presente(fuente, campo)) return;
    const bruto = fuente[campo] === null || fuente[campo] === undefined ? '' : String(fuente[campo]);
    // Tope bruto antes de sanear para no procesar textos enormes.
    if (bruto.length > LIMITES[campo] * 5) { errores[campo] = campo + ' supera ' + LIMITES[campo] + ' caracteres'; return; }
    const texto = textoLimpio(bruto);
    if (texto === null) errores[campo] = campo + ' no puede contener etiquetas HTML';
    else if (texto.length > LIMITES[campo]) errores[campo] = campo + ' supera ' + LIMITES[campo] + ' caracteres';
    else limpio[campo] = texto || null;
  });

  if (presente(fuente, 'precio')) {
    const p = fuente.precio;
    if (p === null || p === '') limpio.precio = null;
    else if (!entero(p) || Number(p) < 0 || Number(p) > PRECIO_MAX) errores.precio = 'precio debe ser un entero en CLP mayor o igual a 0';
    else limpio.precio = Number(p);
  }

  if (presente(fuente, 'publicado')) {
    const p = fuente.publicado;
    if (p === true || p === 'true') limpio.publicado = true;
    else if (p === false || p === 'false') limpio.publicado = false;
    else errores.publicado = 'publicado debe ser booleano (true/false)';
  } else if (!parcial) {
    limpio.publicado = false;
  }

  if (presente(fuente, 'orden')) {
    if (!entero(fuente.orden) || Number(fuente.orden) < 0) errores.orden = 'orden debe ser un entero mayor o igual a 0';
    else limpio.orden = Number(fuente.orden);
  }

  if (Object.keys(errores).length) throw new AppError('VALIDATION_ERROR', 'Datos inválidos', 400, errores);
  return limpio;
}

/**
 * Valida el cuerpo de PATCH /orden: { ids: [id, ...] } sin repetidos. La posición define el orden.
 * @param {object} body
 * @returns {number[]}
 */
function validarOrden(body) {
  const ids = body && body.ids;
  const valido = Array.isArray(ids) && ids.length > 0 && ids.length <= MAX_IDS_ORDEN &&
    ids.every(function (id) { return entero(id) && Number(id) >= 1; }) &&
    new Set(ids.map(Number)).size === ids.length;
  if (!valido) {
    throw new AppError('VALIDATION_ERROR', 'ids debe ser una lista de ids enteros, sin repetidos (máx. ' + MAX_IDS_ORDEN + ')', 400, { campo: 'ids' });
  }
  return ids.map(Number);
}

/**
 * Proyección pública: solo lo que muestra la web (sin `publicado`, fechas internas ni nombre de archivo).
 * @param {object} item instancia o plain object
 */
function aPublico(item) {
  const p = item && item.get ? item.get({ plain: true }) : item;
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || null,
    categoria: p.categoria || null,
    precio: p.precio === null || p.precio === undefined ? null : Number(p.precio),
    imagen_url: p.imagen ? (process.env.PREFIJO || '') + '/uploads_limpiecitoweb/publicaciones/' + p.imagen : null,
    orden: p.orden
  };
}

/** Proyección para la administración: la pública más `publicado`. */
function aAdmin(item) {
  const p = item && item.get ? item.get({ plain: true }) : item;
  return Object.assign(aPublico(p), { publicado: !!p.publicado });
}

module.exports = { validarPayload: validarPayload, validarOrden: validarOrden, aPublico: aPublico, aAdmin: aAdmin };
