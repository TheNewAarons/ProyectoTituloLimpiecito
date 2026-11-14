/**
 * RF-WEB-03 — tests de magic bytes de libs/multer_publicaciones.js (sin multer ni BD).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validarMagicBytes } = require('../../libs/multer_publicaciones');

describe('validarMagicBytes', () => {
  let dir;
  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pubimg-')); });
  afterAll(() => { fs.rmdirSync(dir, { recursive: true }); });

  function escribir(nombre, bytes) {
    const p = path.join(dir, nombre);
    fs.writeFileSync(p, Buffer.from(bytes));
    return p;
  }

  it('acepta JPEG (FF D8 FF)', async () => {
    await expect(validarMagicBytes(escribir('a.jpg', [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]))).resolves.toBe(true);
  });

  it('acepta PNG (89 50 4E 47)', async () => {
    await expect(validarMagicBytes(escribir('a.png', [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).resolves.toBe(true);
  });

  it('acepta WEBP (RIFF....WEBP)', async () => {
    const b = Buffer.alloc(12);
    b.write('RIFF', 0, 'ascii');
    b.write('WEBP', 8, 'ascii');
    await expect(validarMagicBytes(escribir('a.webp', b))).resolves.toBe(true);
  });

  it('rechaza un archivo que no es imagen', async () => {
    await expect(validarMagicBytes(escribir('x.jpg', Buffer.from('%PDF-1.4')))).rejects.toMatchObject({ code: 'IMAGEN_INVALIDA' });
  });

  it('rechaza un archivo inexistente', async () => {
    await expect(validarMagicBytes(path.join(dir, 'no-existe.jpg'))).rejects.toMatchObject({ code: 'IMAGEN_INVALIDA' });
  });
});
