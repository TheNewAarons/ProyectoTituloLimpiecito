/**
 * RNF-ARQ-01 (parte 1, SCRUM-42) — Formulario de contacto de la web en /api/v1/public/contacto, equivalente de
 * POST /contactanos_web/contactanos. Mismo destinatario y asunto; además valida los campos, escapa el HTML del
 * correo y responde un error JSON si el correo no sale (el legacy dejaba la petición sin respuesta).
 */

const AppError = require('../../libs/app-error');
const { crearTransporte, smtpConfigurado } = require('../correo/transporte');

const DESTINO = 'contacto@aseolimpiecito.cl'; // el mismo del legacy (routes/sistema_web/Contactanos.js)
const RE_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const LARGO = { nombre: 100, email: 150, celular: 30, mensaje: 2000 };

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Valida y normaliza el cuerpo. celular es opcional; los demás obligatorios. */
function normalizar(body) {
  const b = body || {};
  const errores = {};
  const r = {};
  Object.keys(LARGO).forEach(function (k) {
    const v = b[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      if (k !== 'celular') errores[k] = 'obligatorio';
      r[k] = null;
      return;
    }
    if (typeof v !== 'string') { errores[k] = 'debe ser texto'; return; }
    r[k] = v.trim();
    if (r[k].length > LARGO[k]) errores[k] = 'maximo ' + LARGO[k] + ' caracteres';
  });
  if (r.email && !errores.email && !RE_EMAIL.test(r.email)) errores.email = 'correo invalido';
  if (Object.keys(errores).length) throw new AppError('CAMPO_INVALIDO', 'revise los campos del formulario', 400, errores);
  return r;
}

function armarCorreo(c) {
  return {
    from: '"Formulario Limpiecito" <no-reply@aseolimpiecito.cl>',
    to: DESTINO,
    replyTo: c.email,
    subject: '✔ Mensaje Aseo Limpiecito solicitud desde contacto ✔',
    text: 'Solicitud de contacto desde aseolimpiecito.cl\n\nNombre: ' + c.nombre + '\nCorreo: ' + c.email +
      '\nCelular: ' + (c.celular || '-') + '\n\n' + c.mensaje,
    html: '<b>Han solicitado información desde el formulario de contacto.</b><br>' +
      'Nombre: <b>' + escapar(c.nombre) + '</b><br>Correo: <b>' + escapar(c.email) + '</b><br>' +
      'Celular: <b>' + escapar(c.celular || '-') + '</b><br><br>' + escapar(c.mensaje).replace(/\r?\n/g, '<br>')
  };
}

async function enviar(body, transporte) {
  const c = normalizar(body);
  if (!transporte && !smtpConfigurado()) throw new AppError('CORREO_NO_CONFIGURADO', 'el envio de correo no esta disponible', 503);
  try {
    await (transporte || crearTransporte()).sendMail(armarCorreo(c));
  } catch (e) {
    console.error('[contacto] fallo el envio del correo:', e && e.message); // sin datos del formulario en el log
    throw new AppError('CORREO_NO_ENVIADO', 'no se pudo enviar el mensaje, intente mas tarde', 502);
  }
  return { enviado: true };
}

module.exports = { normalizar: normalizar, armarCorreo: armarCorreo, enviar: enviar, DESTINO: DESTINO };
