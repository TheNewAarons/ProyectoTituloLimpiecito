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
// Logo embebido como adjunto inline (cid): se ve sin depender de una URL pública.
const LOGO_PATH = path.join(__dirname, '..', '..', 'views', 'ordenes-compra', 'logo-limpiecito.png');
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
 * Peso chileno entero con separador de miles: 12345 -> "$12.345" (sin depender del ICU de Node).
 * @param {number} monto
 * @returns {string}
 */
function formatoClp(monto) {
  const entero = Math.round(monto);
  return (entero < 0 ? '-$' : '$') + String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * @param {object} orden instancia Orden_compra con `proveedor` e `items` cargados
 * @param {Object<number, string>} [nombresProducto] nombre por producto_id; si falta, "Producto <id>"
 * @returns {{html: string, asunto: string}}
 */
function renderizarOrden(orden, nombresProducto) {
  const nombres = nombresProducto || {};
  const proveedor = orden.proveedor || {};
  const items = (orden.items || []).map(function (item, i) {
    const cantidad = Number(item.cantidad);
    const tienePrecio = item.costo_unitario !== null && item.costo_unitario !== undefined;
    const precio = tienePrecio ? Number(item.costo_unitario) : null;
    return {
      numero: i + 1,
      producto_id: item.producto_id,
      nombre: nombres[item.producto_id] || 'Producto ' + item.producto_id,
      cantidad: cantidad,
      precio: tienePrecio ? formatoClp(precio) : '—',
      subtotalNumero: tienePrecio ? precio * cantidad : 0,
      subtotal: tienePrecio ? formatoClp(precio * cantidad) : '—',
      sinPrecio: !tienePrecio
    };
  });
  const datos = {
    empresaNombre: process.env.EMPRESA_NOMBRE || 'Aseo Limpiecito',
    empresaRut: process.env.EMPRESA_RUT || '',
    numeroOrden: orden.id,
    fecha: fecha.hoySantiago().split('-').reverse().join('/'),
    proveedorNombre: proveedor.nombre || '',
    proveedorRut: proveedor.rut || '',
    proveedorContacto: proveedor.contacto || '',
    items: items,
    totalProductos: items.length,
    totalUnidades: items.reduce(function (total, item) { return total + item.cantidad; }, 0),
    total: formatoClp(items.reduce(function (total, item) { return total + item.subtotalNumero; }, 0)),
    hayItemsSinPrecio: items.some(function (item) { return item.sinPrecio; })
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
 * @param {Object<number, string>} [nombresProducto] nombre por producto_id para el detalle
 * @returns {Promise<void>}
 */
async function enviarCorreoOrdenCompra(orden, emailDestino, transporte, nombresProducto) {
  const t = transporte || crearTransporteDesdeEnv();
  const { html, asunto } = renderizarOrden(orden, nombresProducto);
  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to: emailDestino,
      subject: asunto,
      html: html,
      attachments: [{ filename: 'logo-limpiecito.png', path: LOGO_PATH, cid: 'logo-limpiecito' }]
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
