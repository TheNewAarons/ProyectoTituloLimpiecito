/**
 * RNF-SEC-01 (AUT-015, obs. 18 de las pruebas web) — documentos internos solo con sesión.
 *  - middleware/documentos-protegidos: delante del estático /uploads; deja pasar imágenes de la app y documentos públicos.
 *  - GET /api/v1/documentos/:id/contenido (Admin / LVL_ARCHIVO) entrega el PDF.
 *  - GET /documento/descargar-pdf/:id (legacy) exige sesión.
 */
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones', 3: 'LVL_ARCHIVO' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sistema_base/Documento', () => ({ findOne: jest.fn(), findById: jest.fn(), belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Categoria', () => ({}));
jest.mock('../../modelos/sistema_base/Asociacion_trabajador', () => ({}));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Documento = require('../../modelos/sistema_base/Documento');
const proteger = require('../../middleware/documentos-protegidos');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores } = require('../../middleware/errores');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');

const CLAVE = 'clave-de-prueba-aut-015';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 2, correo: 'u2@prueba.cl', roleId: 2 }, CLAVE);
const ARCHIVO = jwt.sign({ id: 3, correo: 'u3@prueba.cl', roleId: 3 }, CLAVE);

// Archivo real en uploads/ para probar el estático y el envío.
const NOMBRE = 'prueba-aut015-' + Date.now() + '.pdf';
const RUTA = path.resolve('uploads', NOMBRE);
beforeAll(() => { fs.mkdirSync(path.resolve('uploads'), { recursive: true }); fs.writeFileSync(RUTA, '%PDF-1.4\n%aut015\n'); });
afterAll(() => { try { fs.unlinkSync(RUTA); } catch (e) { /* ya borrado */ } });
let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());
beforeEach(() => { process.env.SECRET_KEY = CLAVE; jest.clearAllMocks(); });

function app() {
  const a = express();
  a.use('/web-limpiecito/uploads', proteger);
  a.use('/web-limpiecito/uploads', express.static(path.resolve('uploads')));
  a.use('/api/v1/documentos', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES.concat(['LVL_ARCHIVO'])), require('../../api/v1/documentos/routes'));
  a.use('/documento', require('../../routes/documentos/Documento'));
  a.use(manejadorErrores);
  return a;
}

describe('estático /web-limpiecito/uploads con filtro de documentos', () => {
  it('un documento interno (privado) responde 404 sin sesión', async () => {
    Documento.findOne.mockResolvedValue({ id: 7, publico: false });
    const r = await request(app()).get('/web-limpiecito/uploads/' + NOMBRE);
    expect(r.status).toBe(404);
    expect(Documento.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { url: ['uploads/' + NOMBRE, 'uploads\\' + NOMBRE] } }));
  });

  it('un documento marcado como público sigue disponible', async () => {
    Documento.findOne.mockResolvedValue({ id: 7, publico: true });
    const r = await request(app()).get('/web-limpiecito/uploads/' + NOMBRE);
    expect(r.status).toBe(200);
  });

  it('un archivo de la raíz que no es de ningún documento responde 404 (denegar por defecto)', async () => {
    Documento.findOne.mockResolvedValue(null);
    expect((await request(app()).get('/web-limpiecito/uploads/' + NOMBRE)).status).toBe(404);
  });

  it('ante un error de BD se deniega', async () => {
    Documento.findOne.mockRejectedValue(new Error('BD caída'));
    expect((await request(app()).get('/web-limpiecito/uploads/' + NOMBRE)).status).toBe(404);
  });

  it.each(['servicios', 'categoria_servicios', 'cate-extra', 'instructivos'])(
    'las imágenes de la app (%s/) pasan sin consultar documentos', async (carpeta) => {
      const next = jest.fn();
      await proteger({ path: '/' + carpeta + '/foto.jpg' }, {}, next);
      expect(next).toHaveBeenCalled();
      expect(Documento.findOne).not.toHaveBeenCalled();
    });

  it.each([
    '/web-limpiecito/uploads/servicios/../' + NOMBRE,
    '/web-limpiecito/uploads/servicios/%2e%2e/' + NOMBRE,
    '/web-limpiecito/uploads/servicios%5C..%5C' + NOMBRE
  ])('no se puede saltar el filtro pasando por una carpeta pública: %s', async (url) => {
    Documento.findOne.mockResolvedValue({ id: 7, publico: false });
    const r = await request(app()).get(url);
    expect(r.status).toBe(404);
    expect(r.text).not.toContain('%PDF');
  });

  it('uploads/documentos/ (carga antigua) también se filtra', async () => {
    Documento.findOne.mockResolvedValue(null);
    const res = { status: jest.fn(() => res), end: jest.fn() };
    const next = jest.fn();
    await proteger({ path: '/documentos/trab2_cat1.pdf' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('GET /api/v1/documentos/:id/contenido', () => {
  beforeEach(() => {
    Documento.findById.mockImplementation(async (id) => ({ 7: { id: 7, nombre: 'Contrato Pérez', url: 'uploads/' + NOMBRE }, 8: { id: 8, nombre: 'Sin archivo', url: 'uploads/no-existe.pdf' } }[id] || null));
  });

  it('sin token 401 y con Operaciones 403', async () => {
    expect((await request(app()).get('/api/v1/documentos/7/contenido')).status).toBe(401);
    expect((await request(app()).get('/api/v1/documentos/7/contenido').set('x-access-token', OPERACIONES)).status).toBe(403);
  });

  it.each([['Administrador', ADMIN], ['LVL_ARCHIVO', ARCHIVO]])('%s recibe el PDF inline y sin caché', async (_r, token) => {
    const r = await request(app()).get('/api/v1/documentos/7/contenido').set('x-access-token', token);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/application\/pdf/);
    expect(r.headers['content-disposition']).toBe('inline; filename="Contrato_Perez.pdf"');
    expect(r.headers['cache-control']).toBe('private, no-store');
  });

  it('documento inexistente, archivo ausente e id inválido', async () => {
    expect((await request(app()).get('/api/v1/documentos/99/contenido').set('x-access-token', ADMIN)).body.error.code).toBe('NO_ENCONTRADO');
    expect((await request(app()).get('/api/v1/documentos/8/contenido').set('x-access-token', ADMIN)).body.error.code).toBe('ARCHIVO_NO_DISPONIBLE');
    expect((await request(app()).get('/api/v1/documentos/abc/contenido').set('x-access-token', ADMIN)).status).toBe(400);
  });
});

describe('GET /documento/descargar-pdf/:id (legacy)', () => {
  it('sin sesión 401; con Administrador entrega el archivo', async () => {
    Documento.findOne.mockResolvedValue({ id: 7, url: 'uploads/' + NOMBRE });
    expect((await request(app()).get('/documento/descargar-pdf/7')).status).toBe(401);
    expect((await request(app()).get('/documento/descargar-pdf/7').set('x-access-token', ADMIN)).status).toBe(200);
  });

  it('documento inexistente responde 404 en vez de lanzar', async () => {
    Documento.findOne.mockResolvedValue(null);
    expect((await request(app()).get('/documento/descargar-pdf/99').set('x-access-token', ADMIN)).status).toBe(404);
  });
});
