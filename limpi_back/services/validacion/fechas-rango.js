/**
 * AUT-026 (retroalimentación): rangos razonables para fechas de día de trabajador y cliente (antes se aceptaba 2050,
 * nacimientos futuros o un término anterior al inicio). Mismos límites que la directiva appFechaRango del front.
 * Campos vacíos se aceptan (los formularios no los exigen); un texto que no es fecha se rechaza.
 */
const fecha = require('../../libs/fecha');

// [años hacia atrás, años hacia adelante] respecto de hoy (America/Santiago).
const RANGOS = {
  fecha_nacimiento: [-80, -18, 'La fecha de nacimiento debe corresponder a una edad entre 18 y 80 años'],
  fecha_inicio_contrato: [-40, 1, 'El inicio de contrato debe estar entre hace 40 años y dentro de 1 año'],
  fecha_termino_contrato: [-40, 5, 'El término de contrato debe estar entre hace 40 años y dentro de 5 años'],
  fecha_facturacion: [-10, 2, 'La fecha de facturación debe estar entre hace 10 años y dentro de 2 años']
};
const CAMPOS = {
  trabajador: ['fecha_nacimiento', 'fecha_inicio_contrato', 'fecha_termino_contrato'],
  cliente: ['fecha_facturacion', 'fecha_inicio_contrato', 'fecha_termino_contrato']
};

const sumarAnios = (ymd, n) => String(Number(ymd.slice(0, 4)) + n).padStart(4, '0') + ymd.slice(4);

/** 'YYYY-MM-DD' desde 'YYYY-MM-DD…' (también ISO con hora); null si vacío; undefined si no es una fecha. */
function aYmd(v) {
  if (v === null || v === undefined || v === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (!m || isNaN(new Date(m[0] + 'T00:00:00Z').getTime()) || Number(m[2]) > 12 || Number(m[3]) > 31) return undefined;
  return m[0];
}

/**
 * @param {'trabajador'|'cliente'} tipo
 * @param {object} datos el objeto que envía el formulario
 * @param {string} [hoy] YYYY-MM-DD (tests)
 * @returns {{campo:string, mensaje:string}|null} el primer error, o null si todo está en rango
 */
function validar(tipo, datos, hoy) {
  const d = datos || {};
  const h = hoy || fecha.hoySantiago();
  const valores = {};
  for (const campo of CAMPOS[tipo]) {
    const v = aYmd(d[campo]);
    if (v === undefined) return { campo: campo, mensaje: campo.replace(/_/g, ' ') + ' no es una fecha válida' };
    valores[campo] = v;
    const r = RANGOS[campo];
    if (v !== null && (v < sumarAnios(h, r[0]) || v > sumarAnios(h, r[1]))) return { campo: campo, mensaje: r[2] };
  }
  if (valores.fecha_inicio_contrato && valores.fecha_termino_contrato && valores.fecha_termino_contrato < valores.fecha_inicio_contrato) {
    return { campo: 'fecha_termino_contrato', mensaje: 'El término de contrato no puede ser anterior al inicio' };
  }
  return null;
}

/** Para los controladores legacy: responde 400 y devuelve true si hay un error. */
function responderSiInvalidas(res, tipo, datos) {
  const e = validar(tipo, datos);
  if (!e) return false;
  res.status(400).json({ ok: false, error: { code: 'FECHA_FUERA_DE_RANGO', message: e.mensaje, details: { campo: e.campo } } });
  return true;
}

module.exports = { validar, responderSiInvalidas, RANGOS };
