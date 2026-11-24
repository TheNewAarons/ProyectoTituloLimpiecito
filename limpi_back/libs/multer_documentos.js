/**
 * RF-WEB-02 (AUT-011) — Subida de PDF para reemplazar el archivo de un documento: mismo destino que libs/multer.js
 * (uploads/, nombre UUID no predecible) pero con tope de tamaño y solo extensión .pdf.
 */
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_BYTES = 25 * 1024 * 1024; // documentos internos (contratos escaneados): más holgado que los 10 MB públicos

const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase())
});

module.exports = multer({ storage: storage, limits: { fileSize: MAX_BYTES, files: 1 } });
module.exports.MAX_BYTES = MAX_BYTES;
