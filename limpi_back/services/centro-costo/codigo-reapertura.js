/**
 * Código de confirmación por correo para reabrir un centro de costo o una liquidación.
 * 6 dígitos, 10 minutos, un solo uso, 5 intentos; ligado al usuario y al objeto (centro o liquidación). Se guarda solo el hash.
 *
 * shortcut: vive en memoria del proceso (se pierde al reiniciar el backend y no se comparte entre procesos);
 * pasar a una tabla con migración si el backend corre en cluster o con más de una instancia.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { crearTransporte, smtpConfigurado } = require('../correo/transporte');

const PLANTILLA_PATH = path.join(__dirname, '..', '..', 'views', 'centro-costo', 'codigo-reapertura.hbs');
// Mismo logo que el correo de órdenes de compra, embebido como adjunto inline (cid).
const LOGO_PATH = path.join(__dirname, '..', '..', 'views', 'ordenes-compra', 'logo-limpiecito.png');
let plantilla = null;
// Handlebars escapa por defecto: el motivo (texto del usuario) no puede inyectar HTML.
const render = (datos) => {
  if (!plantilla) plantilla = handlebars.compile(fs.readFileSync(PLANTILLA_PATH, 'utf8'));
  return plantilla(datos);
};

const VIGENCIA_MS = 10 * 60 * 1000;
const REENVIO_MS = 60 * 1000;
const MAX_INTENTOS = 5;
const codigos = new Map();

// objetivo: un centro { id, numero_cc } o { clave, descripcion, accion? } (p. ej. clave 'liq:7' para una liquidación).
// accion: verbo en infinitivo del correo ('reabrir' por defecto; p. ej. 'desactivar' un proveedor).
const clave = (usuarioId, objetivoClave) => usuarioId + ':' + objetivoClave;
const describir = (o) => o.descripcion || 'el centro de costo N° ' + o.numero_cc;
const hash = (codigo) => crypto.createHash('sha256').update(String(codigo)).digest('hex');
const iguales = (a, b) => crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

// a***@dominio.cl: confirma el destino sin exponer el correo completo.
const enmascarar = (correo) => {
  const partes = String(correo).split('@');
  return partes[0].charAt(0) + '***@' + (partes[1] || '');
};

/**
 * Genera el código, lo guarda junto al motivo y lo envía. Devuelve el correo enmascarado y la vigencia en segundos.
 * El motivo queda ligado al código: la auditoría usa el mismo texto que llegó por correo.
 */
async function emitirCodigo(usuario, objetivo, motivo, ahora) {
  const t = ahora || Date.now();
  if (!usuario.correo) throw new AppError('SIN_CORREO', 'tu usuario no tiene correo registrado', 409);
  if (!smtpConfigurado()) throw new AppError('CORREO_NO_CONFIGURADO', 'el envío de correos no está configurado', 503);
  const k = clave(usuario.id, objetivo.clave || objetivo.id);
  const objeto = describir(objetivo);
  const accion = objetivo.accion || 'reabrir';
  const previo = codigos.get(k);
  if (previo && t - previo.emitido < REENVIO_MS) {
    throw new AppError('CODIGO_RECIENTE', 'espera un minuto antes de pedir otro código', 429);
  }
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await crearTransporte().sendMail({
    from: process.env.SMTP_USER,
    to: usuario.correo,
    subject: 'Código para ' + accion + ' ' + objeto,
    text: 'Tu código para ' + accion + ' ' + objeto + ' es ' + codigo +
      '. Vence en 10 minutos. Motivo: ' + motivo + '. Si no fuiste tú, cambia tu contraseña y avisa al administrador.',
    html: render({
      codigo: codigo,
      objeto: objeto,
      accion: accion,
      Accion: accion.charAt(0).toUpperCase() + accion.slice(1),
      motivo: motivo,
      nombre: usuario.nombre,
      minutos: VIGENCIA_MS / 60000,
      fecha: fecha.hoySantiago().split('-').reverse().join('/')
    }),
    attachments: [{ filename: 'logo-limpiecito.png', path: LOGO_PATH, cid: 'logo-limpiecito' }]
  });
  // Se guarda después del envío: si el correo falla, no queda un código que nadie recibió.
  codigos.set(k, { hash: hash(codigo), motivo: motivo, emitido: t, expira: t + VIGENCIA_MS, intentos: 0 });
  return { correo: enmascarar(usuario.correo), vigencia_segundos: VIGENCIA_MS / 1000 };
}

/** Valida y consume el código; devuelve el motivo guardado. Lanza 400 si no existe, venció, no coincide o se agotaron los intentos. */
function consumirCodigo(usuarioId, objetivoClave, codigo, ahora) {
  const t = ahora || Date.now();
  const k = clave(usuarioId, objetivoClave);
  const registro = codigos.get(k);
  if (!registro || t > registro.expira) {
    codigos.delete(k);
    throw new AppError('CODIGO_EXPIRADO', 'el código venció o no existe, pide uno nuevo', 400);
  }
  if (!/^\d{6}$/.test(String(codigo)) || !iguales(hash(codigo), registro.hash)) {
    registro.intentos += 1;
    const quedan = MAX_INTENTOS - registro.intentos;
    if (quedan <= 0) {
      codigos.delete(k);
      throw new AppError('CODIGO_BLOQUEADO', 'demasiados intentos, pide un código nuevo', 400);
    }
    throw new AppError('CODIGO_INVALIDO', 'código incorrecto, te quedan ' + quedan + ' intentos', 400, { intentos_restantes: quedan });
  }
  codigos.delete(k);
  return registro.motivo;
}

module.exports = { emitirCodigo, consumirCodigo, _codigos: codigos };
