/**
 * RF-WEB-03 — Tests de la capa HTTP de /api/v1/web/publicaciones (solo Admin) y del portal
 * público GET /api/v1/public/publicaciones. La lógica pura se cubre en tests/services/web y la
 * subida/magic bytes en tests/libs/multer-publicaciones.test.js.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_web/Publicacion', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../libs/multer_publicaciones', () => ({
  subirImagen: () => (req, res, next) => next(),
  validarMagicBytes: jest.fn(async () => true),
  borrarImagen: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Publicacion = require('../../modelos/sistema_web/Publicacion');

const { autenticar, requerirRol } = require('../../middleware/auth');
const routerAdmin = require('../../api/v1/web/publicaciones/routes');
const routerPublic = require('../../api/v1/public/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';

process.env.PREFIJO = '/web-limpiecito';

function pubMock(attrs) {
  const data = Object.assign({
    id: 1, titulo: 'Título', cuerpo: '<p>Contenido</p>', imagen: null,
    fecha_publicacion: new Date('2026-01-01T00:00:00Z'),
    fecha_expiracion: null, publicado: false
  }, attrs);
  const instancia = Object.assign({}, data, {
    update: jest.fn(async (cambios) => { Object.assign(data, cambios); }),
    get: () => Object.assign({}, data)
  });
  Object.defineProperty(instancia, 'publicado', { get: () => data.publicado });
  return instancia;
}

function buildAppAdmin() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/web/publicaciones', autenticar, requerirRol('Administrador'), routerAdmin);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

function buildAppPublic() {
  const app = express();
  app.use('/api/v1/public', routerPublic);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

function configurarJwtYRol() {
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 };
    if (token === TOKEN_RRHH) return { id: 2, nombre: 'RRHH', correo: 'r@r.com', roleId: 2 };
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

beforeEach(() => {
  jest.clearAllMocks();
  configurarJwtYRol();
});

describe('GET /api/v1/web/publicaciones (admin)', () => {
  it('lista todas ordenadas por fecha_publicacion DESC con meta.total y campo vigente/imagen_url', async () => {
    Publicacion.findAll.mockResolvedValue([
      pubMock({ id: 1, imagen: 'a.jpg', publicado: true, fecha_publicacion: new Date('2026-01-01T00:00:00Z') }),
      pubMock({ id: 2, publicado: false, fecha_publicacion: new Date('2026-02-01T00:00:00Z') })
    ]);
    const res = await request(buildAppAdmin()).get('/api/v1/web/publicaciones').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(200);
    expect(Publicacion.findAll).toHaveBeenCalledWith({ order: [['fecha_publicacion', 'DESC']] });
    expect(res.body.meta).toEqual({ total: 2 });
    expect(res.body.data[0]).toMatchObject({
      id: 1,
      publicado: true,
      imagen_url: '/web-limpiecito/uploads_limpiecitoweb/publicaciones/a.jpg',
      vigente: true
    });
    expect(res.body.data[1]).toMatchObject({ id: 2, vigente: false });
  });

  it('id no numérico responde 400 sin consultar el modelo', async () => {
    const res = await request(buildAppAdmin()).get('/api/v1/web/publicaciones/abc').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(Publicacion.findById).not.toHaveBeenCalled();
  });

  it('id inexistente responde 404', async () => {
    Publicacion.findById.mockResolvedValue(null);
    const res = await request(buildAppAdmin()).get('/api/v1/web/publicaciones/99').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('POST /api/v1/web/publicaciones (admin)', () => {
  it('crea con publicado default false y responde 201', async () => {
    Publicacion.create.mockImplementation(async (campos) => pubMock(Object.assign({ id: 9 }, campos)));
    const res = await request(buildAppAdmin())
      .post('/api/v1/web/publicaciones')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ titulo: 'Nueva', cuerpo: '<p>cuerpo</p>', fecha_publicacion: '2026-03-01T00:00:00Z' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 9, publicado: false });
    expect(Publicacion.create).toHaveBeenCalledWith(expect.objectContaining({ publicado: false }));
  });

  it('cuerpo vacío tras sanitizar responde 400 y no crea', async () => {
    const res = await request(buildAppAdmin())
      .post('/api/v1/web/publicaciones')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ titulo: 'Nueva', cuerpo: '<script>x</script>', fecha_publicacion: '2026-03-01T00:00:00Z' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(Publicacion.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/v1/web/publicaciones/:id (admin)', () => {
  it('edición parcial actualiza solo los campos enviados', async () => {
    const p = pubMock({ id: 4, titulo: 'Viejo', publicado: true });
    Publicacion.findById.mockResolvedValue(p);
    const res = await request(buildAppAdmin())
      .put('/api/v1/web/publicaciones/4')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ titulo: 'Nuevo título' });
    expect(res.status).toBe(200);
    expect(res.body.data.titulo).toBe('Nuevo título');
    expect(res.body.data.cuerpo).toBe('<p>Contenido</p>');
  });
});

describe('DELETE /api/v1/web/publicaciones/:id (admin)', () => {
  it('despublica (publicado=false) sin borrar físicamente', async () => {
    const p = pubMock({ id: 5, publicado: true });
    Publicacion.findById.mockResolvedValue(p);
    const res = await request(buildAppAdmin()).delete('/api/v1/web/publicaciones/5').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.data.publicado).toBe(false);
    expect(p.update).toHaveBeenCalledWith({ publicado: false });
  });
});

describe('autorización de /api/v1/web/publicaciones', () => {
  it('sin token responde 401', async () => {
    const res = await request(buildAppAdmin()).get('/api/v1/web/publicaciones');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
  });

  it('rol no Admin responde 403 sin tocar el modelo', async () => {
    const res = await request(buildAppAdmin()).get('/api/v1/web/publicaciones').set('x-access-token', TOKEN_RRHH);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(Publicacion.findAll).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/public/publicaciones', () => {
  it('lista solo vigentes y expone claves públicas (sin publicado ni imagen interna)', async () => {
    Publicacion.findAll.mockResolvedValue([
      pubMock({ id: 10, titulo: 'Pública', imagen: 'x.jpg', publicado: true })
    ]);
    const res = await request(buildAppPublic()).get('/api/v1/public/publicaciones');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1 });
    expect(Publicacion.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ publicado: true }) })
    );
    expect(res.body.data[0]).toMatchObject({
      id: 10,
      titulo: 'Pública',
      imagen_url: '/web-limpiecito/uploads_limpiecitoweb/publicaciones/x.jpg'
    });
    expect(res.body.data[0].publicado).toBeUndefined();
    expect(res.body.data[0].imagen).toBeUndefined();
  });
});
