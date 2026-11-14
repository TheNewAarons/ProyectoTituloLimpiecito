/**
 * RF-WEB-02 — Tests de la capa HTTP de /api/v1/public (listar/descargar, sin auth, con rate
 * limit) y /api/v1/archivos/:id/publicar (solo Admin). La logica pura (validarPdf,
 * resolverRutaSegura, nombreDescarga) ya se cubre en tests/archivos/documento-publico.test.js y
 * el rate limit unitario en tests/middleware/rate-limit.test.js: aqui solo se verifica el
 * cableado HTTP y que el portal nunca exponga documentos no publicos ni rutas internas.
 */
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Documento', () => ({
  findById: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Categoria', () => ({
  findAll: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');

const { autenticar, requerirRol } = require('../../middleware/auth');
const routerArchivos = require('../../api/v1/archivos/routes');
const routerPublic = require('../../api/v1/public/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';

const UPLOADS = path.resolve('uploads');
const PREFIJO = 'test-rfweb02-';
const PDF_OK = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n';
const creados = [];

function escribirPdf(nombre, contenido) {
  const ruta = path.join(UPLOADS, PREFIJO + nombre);
  fs.writeFileSync(ruta, contenido || PDF_OK);
  creados.push(ruta);
  return 'uploads/' + PREFIJO + nombre;
}

function buildAppPublic() {
  const app = express();
  app.use('/api/v1/public', routerPublic);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

// Mismo montaje que index.js: auth + rol Admin antes del router de archivos.
function buildAppArchivos() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/archivos', autenticar, requerirRol('Administrador'), routerArchivos);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

function configurarJwtYRol() {
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin User', correo: 'a@a.com', roleId: 1 };
    if (token === TOKEN_RRHH) return { id: 2, nombre: 'RRHH User', correo: 'r@r.com', roleId: 2 };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Role.findById.mockImplementation((id) => {
    if (id === 1) return Promise.resolve({ id: 1, nombre: 'Administrador' });
    if (id === 2) return Promise.resolve({ id: 2, nombre: 'RRHH' });
    return Promise.resolve(null);
  });
}

// Documento Sequelize simulado: update muta los datos y get los devuelve planos.
function docMock(attrs) {
  const data = Object.assign({
    id: 1,
    nombre: 'Documento',
    fecha_subida: '2026-01-01',
    estado: 'ACTIVO',
    publico: false,
    fecha_publicacion: null,
    categoriaDocumentoId: 1,
    url: 'uploads/x.pdf'
  }, attrs);
  const instancia = Object.assign({}, data, {
    update: jest.fn(async (cambios) => { Object.assign(data, cambios); }),
    get: () => Object.assign({}, data)
  });
  // El controlador lee documento.publico tras update: debe reflejar el dato mutado.
  Object.defineProperty(instancia, 'publico', { get: () => data.publico });
  return instancia;
}

beforeAll(() => {
  fs.mkdirSync(UPLOADS, { recursive: true });
});

afterAll(() => {
  creados.forEach((ruta) => { try { fs.unlinkSync(ruta); } catch (e) { /* ya borrado */ } });
});

beforeEach(() => {
  jest.clearAllMocks();
  configurarJwtYRol();
});

describe('GET /api/v1/public/documentos/:id/descargar — documento NO publico', () => {
  it('responde 404 con el mismo cuerpo que un id inexistente, aunque el PDF sea valido', async () => {
    const url = escribirPdf('oculto.pdf');
    Documento.findById.mockImplementation((id) => {
      if (id === 7) return Promise.resolve(docMock({ id: 7, publico: false, url: url }));
      return Promise.resolve(null);
    });
    const app = buildAppPublic();

    const resNoPublico = await request(app).get('/api/v1/public/documentos/7/descargar');
    const resInexistente = await request(app).get('/api/v1/public/documentos/999/descargar');

    expect(resNoPublico.status).toBe(404);
    expect(resInexistente.status).toBe(404);
    expect(resNoPublico.body).toEqual(resInexistente.body);
    expect(resNoPublico.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('GET /documentos solo consulta publico=true (no lista documentos privados)', async () => {
    Documento.findAll.mockResolvedValue([]);
    const res = await request(buildAppPublic()).get('/api/v1/public/documentos');
    expect(res.status).toBe(200);
    expect(Documento.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ publico: true }) })
    );
    expect(res.body.data).toEqual([]);
  });
});

describe('path traversal bloqueado', () => {
  it.each([
    ['../package.json'],
    ['uploads/../index.js'],
    ['/etc/passwd'],
    ['uploads-evil/x.pdf']
  ])('descargar con url %s responde 404 aunque el documento sea publico', async (url) => {
    Documento.findById.mockResolvedValue(docMock({ id: 3, publico: true, url: url }));
    const res = await request(buildAppPublic()).get('/api/v1/public/documentos/3/descargar');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it.each([
    ['..%2F..%2Fetc'],
    ['1abc']
  ])('descargar con id no numerico %s responde 404 sin consultar el modelo', async (id) => {
    const res = await request(buildAppPublic()).get('/api/v1/public/documentos/' + id + '/descargar');
    expect(res.status).toBe(404);
    expect(Documento.findById).not.toHaveBeenCalled();
  });

  it('PATCH publicar con url traversal responde 422 y NO llama update', async () => {
    const doc = docMock({ id: 5, publico: false, url: '../package.json' });
    Documento.findById.mockResolvedValue(doc);
    const res = await request(buildAppArchivos())
      .patch('/api/v1/archivos/5/publicar')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ publico: true });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'ARCHIVO_NO_ENCONTRADO' } });
    expect(doc.update).not.toHaveBeenCalled();
  });
});

describe('flujo completo: publicar 3 documentos, listarlos y descargar uno', () => {
  it('PATCH publicar con token Admin responde 200 en los 3; el listado expone solo claves publicas; la descarga entrega el PDF con nombre saneado', async () => {
    const docs = [
      { id: 11, nombre: 'Contrato Tipo A', url: escribirPdf('doc1.pdf') },
      { id: 12, nombre: 'Términos../Legales 2026', url: escribirPdf('doc2.pdf') },
      { id: 13, nombre: 'Guía de Servicios', url: escribirPdf('doc3.pdf') }
    ];
    const mocks = docs.map((d) => docMock(Object.assign({ publico: false }, d)));
    Documento.findById.mockImplementation((id) => Promise.resolve(mocks.find((m) => m.get().id === id) || null));

    const appA = buildAppArchivos();
    for (const d of docs) {
      const res = await request(appA)
        .patch('/api/v1/archivos/' + d.id + '/publicar')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ publico: true });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: d.id, publico: true });
      expect(res.body.data.url).toBeUndefined();
    }

    // Listado publico: los 3 ya publicados.
    Documento.findAll.mockResolvedValue(mocks.map((m) => m.get()));
    Categoria.findAll.mockResolvedValue([{ id: 1, nombre: 'Contratos' }]);
    const lista = await request(buildAppPublic()).get('/api/v1/public/documentos');
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(3);
    expect(lista.body.meta).toMatchObject({ total: 3 });
    lista.body.data.forEach((item) => {
      expect(Object.keys(item).sort()).toEqual(['categoria', 'fecha_publicacion', 'id', 'titulo']);
    });

    // Descarga del documento con titulo con tildes y "../".
    Documento.findById.mockImplementation((id) => Promise.resolve(mocks.find((m) => m.get().id === id) || null));
    const descarga = await request(buildAppPublic()).get('/api/v1/public/documentos/12/descargar').buffer(true);
    expect(descarga.status).toBe(200);
    expect(descarga.headers['content-type']).toContain('application/pdf');
    expect(descarga.headers['content-disposition']).toContain('attachment');
    const m = /filename="?([^";]+)"?/.exec(descarga.headers['content-disposition']);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/^[A-Za-z0-9._-]+\.pdf$/);
    expect(m[1]).not.toMatch(/[\/\\]/);
    expect(Buffer.isBuffer(descarga.body)).toBe(true);
    expect(descarga.body.toString('ascii', 0, 5)).toBe('%PDF-');
  });
});

describe('extras de /api/v1/archivos/:id/publicar', () => {
  it('sin token responde 401 TOKEN_REQUERIDO', async () => {
    const res = await request(buildAppArchivos()).patch('/api/v1/archivos/1/publicar').send({ publico: true });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
  });

  it('rol no Admin responde 403 FORBIDDEN sin tocar el modelo', async () => {
    const res = await request(buildAppArchivos())
      .patch('/api/v1/archivos/1/publicar')
      .set('x-access-token', TOKEN_RRHH)
      .send({ publico: true });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(Documento.findById).not.toHaveBeenCalled();
  });

  it('archivo .pdf sin firma %PDF- responde 422 ARCHIVO_NO_PDF y NO llama update', async () => {
    const url = escribirPdf('firma-mala.pdf', 'esto-no-es-pdf');
    const doc = docMock({ id: 21, url: url });
    Documento.findById.mockResolvedValue(doc);
    const res = await request(buildAppArchivos())
      .patch('/api/v1/archivos/21/publicar')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ publico: true });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'ARCHIVO_NO_PDF' } });
    expect(doc.update).not.toHaveBeenCalled();
  });

  it('archivo mayor a 10 MB responde 422 ARCHIVO_DEMASIADO_GRANDE', async () => {
    const url = escribirPdf('grande.pdf');
    fs.truncateSync(path.resolve(url), 10 * 1024 * 1024 + 1);
    const doc = docMock({ id: 22, url: url });
    Documento.findById.mockResolvedValue(doc);
    const res = await request(buildAppArchivos())
      .patch('/api/v1/archivos/22/publicar')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ publico: true });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'ARCHIVO_DEMASIADO_GRANDE' } });
    expect(doc.update).not.toHaveBeenCalled();
  });
});

describe('rate limit de /api/v1/public', () => {
  it('la peticion 61 en la misma ventana responde 429 con header Retry-After', async () => {
    // App nueva con modulos frescos: el limitador se instancia al requerir routes.js.
    jest.resetModules();
    const expressF = require('express');
    const DocumentoF = require('../../modelos/sistema_base/Documento');
    DocumentoF.findAll.mockResolvedValue([]);
    const routerF = require('../../api/v1/public/routes');
    const errores = require('../../middleware/errores');
    const app = expressF();
    app.use('/api/v1/public', routerF);
    app.use(errores.noEncontrado);
    app.use(errores.manejadorErrores);

    for (let i = 0; i < 60; i += 1) {
      const res = await request(app).get('/api/v1/public/documentos');
      expect(res.status).toBe(200);
    }
    const res61 = await request(app).get('/api/v1/public/documentos');
    expect(res61.status).toBe(429);
    expect(res61.body).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    expect(res61.headers['retry-after']).toBeDefined();
  });
});
