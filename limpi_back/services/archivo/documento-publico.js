/**
 * RF-WEB-02 — Lógica pura de validación/nombre de PDFs públicos (sin modelos ni express),
 * para poder probarla sin BD. Los errores se emiten como AppError con httpStatus 422.
 */

const fs = require('fs');
const path = require('path');
const AppError = require('../../libs/app-error');

const MAX_BYTES = 10 * 1024 * 1024;
const FIRMA_PDF = '%PDF-';

/**
 * Valida un PDF en disco. Orden: extensión, existencia, tamaño, firma `%PDF-`.
 * @param {string} rutaAbsoluta
 * @returns {Promise<void>} resuelve o rechaza con AppError (422)
 */
function validarPdf(rutaAbsoluta) {
  return new Promise((resolve, reject) => {
    if (typeof rutaAbsoluta !== 'string' || path.extname(rutaAbsoluta).toLowerCase() !== '.pdf') {
      return reject(new AppError('ARCHIVO_NO_PDF', 'El archivo debe ser un PDF', 422));
    }

    fs.stat(rutaAbsoluta, (err, stats) => {
      if (err || !stats.isFile()) {
        return reject(new AppError('ARCHIVO_NO_ENCONTRADO', 'El archivo no existe', 422));
      }
      if (stats.size > MAX_BYTES) {
        return reject(new AppError('ARCHIVO_DEMASIADO_GRANDE', 'El archivo supera los 10 MB', 422));
      }

      fs.open(rutaAbsoluta, 'r', (errOpen, fd) => {
        if (errOpen) {
          return reject(new AppError('ARCHIVO_NO_ENCONTRADO', 'El archivo no existe', 422));
        }
        const buf = Buffer.alloc(FIRMA_PDF.length);
        fs.read(fd, buf, 0, FIRMA_PDF.length, 0, (errRead) => {
          fs.close(fd, function () {});
          if (errRead || buf.toString('ascii', 0, FIRMA_PDF.length) !== FIRMA_PDF) {
            return reject(new AppError('ARCHIVO_NO_PDF', 'El archivo debe ser un PDF', 422));
          }
          return resolve();
        });
      });
    });
  });
}

/**
 * Resuelve una url relativa a un path absoluto solo si queda dentro de `uploads/`.
 * Compara contra el separador final para que un prefijo tipo `uploads-evil` no pase.
 * @param {string} url
 * @returns {string|null}
 */
function resolverRutaSegura(url) {
  if (typeof url !== 'string' || url === '') return null;
  let base;
  let abs;
  try {
    // realpath: un symlink dentro de uploads/ que apunte afuera no debe pasar el chequeo de prefijo.
    base = fs.realpathSync(path.resolve('uploads')) + path.sep;
    abs = fs.realpathSync(path.resolve(url));
  } catch (e) {
    return null;
  }
  if (abs === base || abs.indexOf(base) !== 0) return null;
  return abs;
}

/**
 * Sanea un título para usarlo como nombre de archivo descargado, siempre con sufijo `.pdf`.
 * @param {string} titulo
 * @returns {string}
 */
function nombreDescarga(titulo) {
  const base = typeof titulo === 'string' ? titulo : '';
  const sinTildes = base.normalize('NFD').replace(/[̀-ͯ]/g, '');
  let limpio = sinTildes.replace(/[^A-Za-z0-9._-]/g, '_');
  limpio = limpio.replace(/^\.+/, '').replace(/\.{2,}/g, '_');
  limpio = limpio.replace(/\.pdf$/i, '');
  limpio = limpio.slice(0, 100);
  if (limpio === '') limpio = 'documento';
  return limpio + '.pdf';
}

module.exports = {
  validarPdf: validarPdf,
  resolverRutaSegura: resolverRutaSegura,
  nombreDescarga: nombreDescarga
};
