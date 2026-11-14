/**
 * RF-WEB-03 — Subida de imagen de publicaciones. A diferencia de libs/multer_web.js (legacy sin
 * filtro), valida MIME, extensión, tamaño y magic bytes. Los errores se traducen a AppError 422.
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AppError = require('./app-error');

const DIR = path.resolve('uploads_limpiecitoweb', 'publicaciones');

const EXT_POR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp'];
const MIMES = Object.keys(EXT_POR_MIME);
const MAX_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdir(DIR, { recursive: true }, function (err) { cb(err, DIR); });
  },
  filename: function (req, file, cb) {
    // Extensión derivada del MIME, nunca del nombre original.
    cb(null, uuidv4() + EXT_POR_MIME[file.mimetype]);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (MIMES.indexOf(file.mimetype) === -1 || EXTENSIONES.indexOf(ext) === -1) {
    return cb(new AppError('IMAGEN_INVALIDA', 'la imagen debe ser jpg, png o webp', 422));
  }
  cb(null, true);
}

// Campos de texto acotados: el cuerpo admite 20000 caracteres, 128 KB deja margen al HTML.
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1, fields: 10, fieldSize: 128 * 1024, parts: 11 }
});

function mapearErrorMulter(err) {
  if (err instanceof AppError) return err;
  // Errores de disco (ENOSPC, EACCES, mkdir) son del servidor: siguen al 500 del manejador central.
  if (!err || err.name !== 'MulterError') return err;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('IMAGEN_DEMASIADO_GRANDE', 'la imagen supera los 5 MB', 422);
  }
  if (err.code === 'LIMIT_FIELD_VALUE' || err.code === 'LIMIT_FIELD_COUNT' || err.code === 'LIMIT_PART_COUNT') {
    return new AppError('VALIDATION_ERROR', 'formulario demasiado grande', 400);
  }
  // LIMIT_UNEXPECTED_FILE / LIMIT_FILE_COUNT: misma respuesta, sin detalle.
  return new AppError('IMAGEN_INVALIDA', 'la imagen es inválida', 422);
}

/**
 * Middleware de multer para un único archivo en `campo`. Convierte errores de multer en AppError.
 * @param {string} campo
 * @returns {function}
 */
function subirImagen(campo) {
  const mw = upload.single(campo || 'imagen');
  return function (req, res, next) {
    mw(req, res, function (err) {
      if (err) return next(mapearErrorMulter(err));
      next();
    });
  };
}

/**
 * Valida los magic bytes del archivo ya escrito en disco.
 * @param {string} ruta
 * @returns {Promise<boolean>}
 */
function validarMagicBytes(ruta) {
  return new Promise((resolve, reject) => {
    fs.open(ruta, 'r', function (err, fd) {
      if (err) return reject(new AppError('IMAGEN_INVALIDA', 'la imagen es inválida', 422));
      const buf = Buffer.alloc(12);
      fs.read(fd, buf, 0, 12, 0, function (errRead) {
        fs.close(fd, function () {});
        if (errRead) return reject(new AppError('IMAGEN_INVALIDA', 'la imagen es inválida', 422));
        const esJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
        const esPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
        const esWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
        if (esJpeg || esPng || esWebp) return resolve(true);
        return reject(new AppError('IMAGEN_INVALIDA', 'la imagen es inválida', 422));
      });
    });
  });
}

/**
 * Elimina una imagen por nombre de archivo. Best effort: nunca rompe la respuesta si falta.
 * @param {string} nombre
 */
function borrarImagen(nombre) {
  if (!nombre || path.basename(nombre) !== nombre) return;
  fs.unlink(path.join(DIR, nombre), function () {});
}

module.exports = {
  subirImagen: subirImagen,
  validarMagicBytes: validarMagicBytes,
  borrarImagen: borrarImagen
};
