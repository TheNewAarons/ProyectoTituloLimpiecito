/**
 * RF-BOD-03 — Envío de la orden de compra por correo (Nodemailer + plantilla Handlebars).
 * Transporte inyectable para tests; nunca loguea credenciales SMTP.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');

const PLANTILLA_PATH = path.join(__dirname, '..', '..', 'views', 'ordenes-compra', 'orden.hbs');
let plantillaCompilada = null;

/**
 * Compila la plantilla una sola vez (autoescape por defecto de Handlebars: nunca `{{{ }}}`).
 * @returns {HandlebarsTemplateDelegate}
 */
function obtenerPlantilla() {
  if (!plantillaCompilada) {
    const fuente = fs.readFileSync(PLANTILLA_PATH, 'utf8');
    plantillaCompilada = handlebars.compile(fuente);
  }
  return plantillaCompilada;
}

/**
 * Crea el transporte Nodemailer desde variables de entorno. Nunca hardcodea ni loguea
 * credenciales; si faltan, lanza AppError sin revelar valores.
 * @returns {object} transporte Nodemailer
 */
function crearTransporteDesdeEnv() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new AppError('SMTP_NO_CONFIGURADO', 'el correo saliente no esta configurado', 503);
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

/**
 * @param {object} orden instancia Orden_compra con `proveedor` e `items` cargados
 * @returns {{html: string, asunto: string}}
 */
function renderizarOrden(orden) {
  const datos = {
    empresaNombre: process.env.EMPRESA_NOMBRE || 'Aseo Limpiecito',
    empresaRut: process.env.EMPRESA_RUT || '',
    numeroOrden: orden.id,
    fecha: fecha.hoySantiago(),
    proveedorNombre: orden.proveedor ? orden.proveedor.nombre : '',
    items: (orden.items || []).map(function (item) {
      return { producto_id: item.producto_id, cantidad: item.cantidad };
    })
  };
  const html = obtenerPlantilla()(datos);
  return { html: html, asunto: 'Orden de compra #' + orden.id };
}

/**
 * Envía el correo de la orden al email del proveedor. No muta la orden ni abre transacción:
 * el llamador decide el estado según el resultado (ver services/bodega/ordenesCompra.js#enviar).
 * @param {object} orden instancia Orden_compra con `proveedor` e `items`
 * @param {string} emailDestino
 * @param {object} [transporte] transporte Nodemailer inyectado (tests); por defecto se crea desde env
 * @returns {Promise<void>}
 */
async function enviarCorreoOrdenCompra(orden, emailDestino, transporte) {
  const t = transporte || crearTransporteDesdeEnv();
  const { html, asunto } = renderizarOrden(orden);
  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to: emailDestino,
      subject: asunto,
      html: html
    });
  } catch (err) {
    // Solo code/responseCode (p.ej. 'EAUTH', 535): nunca err.message ni err.config, que en
    // nodemailer pueden incluir el host/usuario/credenciales usados en el intento de conexión.
    // eslint-disable-next-line no-console
    console.error('[RF-BOD-03] error SMTP al enviar la orden de compra', {
      code: err && err.code,
      responseCode: err && err.responseCode
    });
    throw new AppError('ENVIO_FALLIDO', 'no se pudo enviar el correo al proveedor', 502);
  }
}

module.exports = {
  crearTransporteDesdeEnv: crearTransporteDesdeEnv,
  renderizarOrden: renderizarOrden,
  enviarCorreoOrdenCompra: enviarCorreoOrdenCompra
};
