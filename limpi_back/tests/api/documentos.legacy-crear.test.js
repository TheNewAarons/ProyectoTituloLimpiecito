/**
 * AUT-011 (obs. 15/17 de las pruebas web del 23-11) — POST /documentos/crear (ruta antigua, routes/documentos/Documento.js).
 * Antes: sin archivo, `req.file.path` lanzaba una excepción no capturada que detenía el proceso del backend.
 * Ahora: sin archivo, archivo que no es PDF real o sin categoría válida -> 400 { mensaje }, sin crear nada y sin
 * dejar el archivo subido en disco; el servidor sigue respondiendo.
 */
jest.mock('../../modelos/sistema_base/Documento', () => ({ belongsTo: jest.fn(), create: jest.fn() }));
jest.mock('../../modelos/sistema_base/Categoria', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Asociacion_trabajador', () => ({}));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');
const rutas = require('../../routes/documentos/Documento');

const UPLOADS = path.resolve('uploads');
const PDF = Buffer.from('%PDF-1.4\n%prueba\n');
const TEXTO = Buffer.from('esto es un txt renombrado');

function app() {
  const a = express();
  a.use('/documentos', rutas);
  return a;
}
const crear = (archivo, campos) => {
  let r = request(app()).post('/documentos/crear');
  Object.keys(campos || {}).forEach((k) => { r = r.field(k, campos[k]); });
  return archivo ? r.attach('pdf', archivo.buf, archivo.nombre) : r;
};
const archivosEnUploads = () => (fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).filter((f) => /\.(pdf|txt)$/i.test(f)) : []);

let antes;
beforeAll(() => { antes = new Set(archivosEnUploads()); });
beforeEach(() => {
  jest.clearAllMocks();
  Categoria.findById.mockImplementation(async (id) => (id === 3 ? { id: 3, nombre: 'Contratos' } : null));
  Documento.create.mockImplementation(async (d) => Object.assign({ id: 99 }, d));
});
afterAll(() => {
  // Borra solo lo que dejó el caso exitoso.
  archivosEnUploads().filter((f) => !antes.has(f)).forEach((f) => fs.unlinkSync(path.join(UPLOADS, f)));
});

describe('POST /documentos/crear (legacy)', () => {
  it('sin archivo responde 400 con mensaje y el servidor sigue respondiendo', async () => {
    const r = await crear(null, { nombre: 'Doc', categoriaDocumentoId: '3', estado: 'true' });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ mensaje: 'Debe adjuntar un archivo PDF.' });
    expect(Documento.create).not.toHaveBeenCalled();
    const otra = await crear(null, {});
    expect(otra.status).toBe(400);
  });

  it('un .txt renombrado a .pdf se rechaza y no queda en disco', async () => {
    const borrar = jest.spyOn(fs, 'unlink');
    const r = await crear({ buf: TEXTO, nombre: 'falso.pdf' }, { nombre: 'Doc', categoriaDocumentoId: '3' });
    expect(r.status).toBe(400);
    expect(r.body.mensaje).toBe('El archivo no es un PDF válido.');
    expect(Documento.create).not.toHaveBeenCalled();
    // Se borra exactamente el archivo que subió multer (no se compara la carpeta: otros tests pueden escribir en uploads).
    expect(borrar).toHaveBeenCalledWith(expect.stringMatching(/uploads[\\/][\w-]+\.pdf$/), expect.any(Function));
    const subido = borrar.mock.calls[0][0];
    await new Promise((ok) => setTimeout(ok, 50));
    expect(fs.existsSync(subido)).toBe(false);
    borrar.mockRestore();
  });

  it('un archivo con otra extensión se rechaza aunque tenga firma PDF', async () => {
    const r = await crear({ buf: PDF, nombre: 'documento.txt' }, { nombre: 'Doc', categoriaDocumentoId: '3' });
    expect(r.status).toBe(400);
    expect(Documento.create).not.toHaveBeenCalled();
  });

  it.each([[undefined, 'sin categoría'], ['abc', 'categoría no numérica'], ['77', 'categoría inexistente']])(
    'PDF válido con %s (%s) responde 400 y no crea', async (cat) => {
      const campos = { nombre: 'Doc' };
      if (cat !== undefined) campos.categoriaDocumentoId = cat;
      const r = await crear({ buf: PDF, nombre: 'ok.pdf' }, campos);
      expect(r.status).toBe(400);
      expect(r.body.mensaje).toBe('Debe elegir una categoría válida.');
      expect(Documento.create).not.toHaveBeenCalled();
    });

  it('PDF válido y categoría existente: crea el documento como antes', async () => {
    const r = await crear({ buf: PDF, nombre: 'contrato.pdf' }, { nombre: 'Contrato', categoriaDocumentoId: '3', estado: 'true', fecha_subida: '2026-11-24 10:00:00' });
    expect(r.status).toBe(200);
    expect(r.body.documento).toMatchObject({ id: 99, nombre: 'Contrato', categoriaDocumentoId: 3, estado: true });
    expect(Documento.create).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\.pdf$/) }));
  });

  it('si la consulta de la categoría falla, responde error sin detener el proceso', async () => {
    Categoria.findById.mockRejectedValue(new Error('BD caída'));
    const r = await crear({ buf: PDF, nombre: 'ok.pdf' }, { nombre: 'Doc', categoriaDocumentoId: '3' });
    expect(r.text).toContain('error');
    expect((await crear(null, {})).status).toBe(400);
  });
});
