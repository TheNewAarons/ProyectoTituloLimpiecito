/**
 * RNF-SEC-01 (AUT-005 parte 2): transporte Nodemailer único para los correos legacy, solo desde SMTP_*.
 * Reemplaza las credenciales que estaban escritas en cada controlador. Nunca loguea credenciales.
 */
const nodemailer = require('nodemailer');

const smtpConfigurado = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function crearTransporte() {
  const opciones = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Igual que la configuración anterior (el servidor de correo actual no presenta un certificado válido).
    // shortcut: no verifica el certificado SMTP; activarlo cuando el servidor tenga uno válido.
    tls: { rejectUnauthorized: false }
  };
  // Sin SMTP_SECURE, nodemailer usa TLS directo en el puerto 465 (comportamiento anterior).
  if (process.env.SMTP_SECURE) opciones.secure = process.env.SMTP_SECURE === 'true';
  return nodemailer.createTransport(opciones);
}

module.exports = { crearTransporte, smtpConfigurado };
