/**
 * RF-010.2 (AUT-011) — PUT /api/v1/archivos/:id/archivo con jsonwebtoken real y el gate de index.js
 * (autenticar + requerirRol(Admin)). Reemplaza el PDF de un documento, conserva el anterior y lo deja en la auditoría.
 */
jest.mock('../../database/database', () => ({
  sequelize: { transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })) }
}));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sistema_base/Documento', () => ({ findById: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const fs = require('fs');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Documento = require('../../modelos/sistema_base/Documento');
const { auditar } = require('../../services/auditoria');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores } = require('../../middleware/errores');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');
const router = require('../../api/v1/archivos/routes');
const { MAX_BYTES } = require('../../libs/multer_documentos');

const CLAVE = 'clave-de-prueba-aut-011';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 2, correo: 'u2@prueba.cl', roleId: 2 }, CLAVE);
const PDF = Buffer.from('%PDF-1.4\n%prueba\n');
const TEXTO = Buffer.from('no soy un pdf');

function app() {
  const a = express();
  // Igual que index.js: autenticar + requerirRol(Admin) delante del router.
  a.use('/api/v1/archivos', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), router);
  a.use(manejadorErrores);
  return a;
}
const reemplazar = (id, token, archivo) => {
  let r = request(app()).put('/api/v1/archivos/' + id + '/archivo');
  if (token) r = r.set('x-access-token', token);
  return archivo ? r.attach('pdf', archivo.buf, archivo.nombre) : r;
};

let doc;
const subidos = [];
let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => {
  consoleError.mockRestore();
  subidos.forEach((p) => { try { fs.unlinkSync(p); } catch (e) { /* ya borrado */ } });
});
beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  doc = { id: 56, nombre: 'Contrato', url: 'uploads/anterior.pdf', update: jest.fn(async function (c) { Object.assign(doc, c); return doc; }) };
  Documento.findById.mockImplementation(async (id) => (Number(id) === 56 ? doc : null));
});

describe('PUT /api/v1/archivos/:id/archivo', () => {
  it('sin token 401 y con Operaciones 403, sin tocar el documento', async () => {
    expect((await reemplazar(56, null, { buf: PDF, nombre: 'a.pdf' })).status).toBe(401);
    expect((await reemplazar(56, OPERACIONES, { buf: PDF, nombre: 'a.pdf' })).status).toBe(403);
    expect(Documento.findById).not.toHaveBeenCalled();
  });

  it('Admin con PDF válido: apunta al archivo nuevo, conserva el anterior y audita antes/después', async () => {
    const borrar = jest.spyOn(fs, 'unlink');
    const r = await reemplazar(56, ADMIN, { buf: PDF, nombre: 'Version2.PDF' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, data: { id: 56, nombre: 'Contrato' }, meta: {} });
    expect(doc.url).toMatch(/uploads[\\/][\w-]+\.pdf$/);
    subidos.push(doc.url);
    expect(borrar).not.toHaveBeenCalled(); // D-WEB-02-R1: el anterior no se borra
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'documentos', entidad_id: 56, accion: 'REEMPLAZAR_ARCHIVO',
      antes: { url: 'uploads/anterior.pdf' }, despues: { url: doc.url }, usuario: { id: 1, contexto: 'usuarios' }
    }));
    borrar.mockRestore();
  });

  it.each([
    ['sin archivo', null, 400, 'ARCHIVO_REQUERIDO'],
    ['PDF falso', { buf: TEXTO, nombre: 'falso.pdf' }, 400, 'ARCHIVO_NO_PDF'],
    ['otra extensión', { buf: PDF, nombre: 'doc.txt' }, 400, 'ARCHIVO_NO_PDF']
  ])('%s: responde error y no modifica el documento', async (_c, archivo, estado, codigo) => {
    const r = await reemplazar(56, ADMIN, archivo);
    expect(r.status).toBe(estado);
    expect(r.body).toMatchObject({ ok: false, error: { code: codigo } });
    expect(doc.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('documento inexistente: 404 y borra el archivo recién subido', async () => {
    const borrar = jest.spyOn(fs, 'unlink');
    const r = await reemplazar(999, ADMIN, { buf: PDF, nombre: 'x.pdf' });
    expect(r.status).toBe(404);
    expect(borrar).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/), expect.any(Function));
    borrar.mockRestore();
  });

  it('id inválido: 400 sin consultar la BD', async () => {
    const r = await reemplazar('abc', ADMIN, { buf: PDF, nombre: 'x.pdf' });
    expect(r.status).toBe(400);
    expect(Documento.findById).not.toHaveBeenCalled();
  });

  it('archivo sobre el tope: 400 ARCHIVO_DEMASIADO_GRANDE', async () => {
    const grande = Buffer.concat([PDF, Buffer.alloc(MAX_BYTES)]);
    const r = await reemplazar(56, ADMIN, { buf: grande, nombre: 'grande.pdf' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('ARCHIVO_DEMASIADO_GRANDE');
    expect(doc.update).not.toHaveBeenCalled();
  });

  it('si falla la auditoría, el error llega como 500 y el archivo subido se borra', async () => {
    auditar.mockRejectedValueOnce(new Error('auditoría caída'));
    const borrar = jest.spyOn(fs, 'unlink');
    const r = await reemplazar(56, ADMIN, { buf: PDF, nombre: 'y.pdf' });
    expect(r.status).toBe(500);
    expect(borrar).toHaveBeenCalled();
    borrar.mockRestore();
  });
});
