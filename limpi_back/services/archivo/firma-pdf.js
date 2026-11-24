/**
 * RF-WEB-02 (AUT-011) — ¿Es un PDF real? Extensión .pdf + firma "%PDF-" en los primeros bytes. Nunca rechaza.
 * Sin el tope de 10 MB de los documentos públicos (services/archivo/documento-publico.js) para no restringir los internos.
 */
const fs = require('fs');
const path = require('path');

function esPdf(ruta) {
  return new Promise((resolve) => {
    if (typeof ruta !== 'string' || path.extname(ruta).toLowerCase() !== '.pdf') return resolve(false);
    fs.open(ruta, 'r', (err, fd) => {
      if (err) return resolve(false);
      const buf = Buffer.alloc(5);
      fs.read(fd, buf, 0, 5, 0, (errRead) => {
        fs.close(fd, () => {});
        resolve(!errRead && buf.toString('ascii') === '%PDF-');
      });
    });
  });
}

module.exports = { esPdf: esPdf };
