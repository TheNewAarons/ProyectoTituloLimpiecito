/**
 * RF-WEB-01 — /api/v1/web/catalogo (solo Admin) y GET /api/v1/public/catalogo (sin auth).
 */
const mockFilas = [];
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ 1: { nombre: 'Administrador' }, 2: { nombre: 'Operaciones' } }[id] || null)) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../libs/multer_publicaciones', () => ({
  subirImagen: () => (req, res, next) => { if (req.headers['x-test-imagen']) req.file = { filename: req.headers['x-test-imagen'], path: '/tmp/x' }; next(); },
  validarMagicBytes: jest.fn(async () => true),
  borrarImagen: jest.fn()
}));
jest.mock('../../modelos/sistema_web/Catalogo_item', () => {
  const instancia = (data) => Object.assign(data, {
    update: jest.fn(async (c) => Object.assign(data, c)),
    destroy: jest.fn(async () => { mockFilas.splice(mockFilas.indexOf(data), 1); }),
    get: () => Object.assign({}, data)
  });
  return {
    instancia,
    findAll: jest.fn(async ({ where } = {}) => mockFilas
      .filter((f) => !where || f.publicado === where.publicado)
      .sort((a, b) => a.orden - b.orden || a.id - b.id)),
    findById: jest.fn(async (id) => mockFilas.find((f) => f.id === id) || null),
    max: jest.fn(async () => mockFilas.reduce((m, f) => Math.max(m, f.orden), 0) || null),
    count: jest.fn(async ({ where }) => mockFilas.filter((f) => where.id.includes(f.id)).length),
    create: jest.fn(async (c) => { const f = instancia(Object.assign({ id: 100 + mockFilas.length, imagen: null }, c)); mockFilas.push(f); return f; }),
    update: jest.fn(async (c, { where }) => { mockFilas.filter((f) => f.id === where.id).forEach((f) => Object.assign(f, c)); return [1]; })
  };
});

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('../../config/auth');
// BD real sin conexión (Sequelize no conecta hasta la primera consulta): solo se simula la transacción.
const db = require('../../database/database');
jest.spyOn(db.sequelize, 'transaction').mockImplementation(async (cb) => cb({ id: 'tx' }));
const Modelo = require('../../modelos/sistema_web/Catalogo_item');
const { borrarImagen } = require('../../libs/multer_publicaciones');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

process.env.PREFIJO = '/web-limpiecito';
const ADMIN = jwt.sign({ id: 1, roleId: 1 }, process.env.SECRET_KEY);
const OPERACIONES = jwt.sign({ id: 2, roleId: 2 }, process.env.SECRET_KEY);

const app = express();
app.use(express.json());
app.use('/admin', autenticar, requerirRol('Administrador'), require('../../api/v1/web/catalogo/routes'));
app.use('/public', require('../../api/v1/public/routes'));
app.use(noEncontrado);
app.use(manejadorErrores);

const sembrar = () => {
  mockFilas.length = 0;
  [
    { id: 1, nombre: 'Limpieza de oficinas', descripcion: 'Por m2', categoria: 'Empresas', imagen: 'a.jpg', precio: '15000', publicado: true, orden: 2 },
    { id: 2, nombre: 'Borrador', descripcion: null, categoria: null, imagen: null, precio: null, publicado: false, orden: 1 },
    { id: 3, nombre: 'Limpieza post obra', descripcion: null, categoria: 'Hogar', imagen: null, precio: null, publicado: true, orden: 1 }
  ].forEach((f) => mockFilas.push(Modelo.instancia(Object.assign({ created_at: new Date(), updated_at: new Date() }, f))));
};
beforeEach(() => { jest.clearAllMocks(); sembrar(); });

describe('administración', () => {
  it('sin sesión 401 y con un rol que no es Admin 403', async () => {
    expect((await request(app).get('/admin')).status).toBe(401);
    expect((await request(app).get('/admin').set('x-access-token', OPERACIONES)).status).toBe(403);
  });

  it('lista todos (también borradores) en orden, con `publicado`', async () => {
    const res = await request(app).get('/admin').set('x-access-token', ADMIN);
    expect(res.body.data.map((i) => i.id)).toEqual([2, 3, 1]);
    expect(res.body.data[0]).toMatchObject({ publicado: false, precio: null });
  });

  it('crea en borrador, al final del orden, sin HTML y con precio entero', async () => {
    const res = await request(app).post('/admin').set('x-access-token', ADMIN).set('x-test-imagen', 'nueva.webp')
      .send({ nombre: '<b>Lavado</b> de alfombras', descripcion: '<script>x</script>Hasta 3 m2', precio: '25000' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Lavado de alfombras', descripcion: 'Hasta 3 m2', precio: 25000, publicado: false, orden: 3 });
    expect(res.body.data.imagen_url).toBe('/web-limpiecito/uploads_limpiecitoweb/publicaciones/nueva.webp');
  });

  it('rechaza datos inválidos con 400 y borra la imagen subida', async () => {
    const res = await request(app).post('/admin').set('x-access-token', ADMIN).set('x-test-imagen', 'mala.jpg')
      .send({ nombre: '', precio: '-5' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['nombre', 'precio']);
    expect(borrarImagen).toHaveBeenCalledWith('mala.jpg');
    expect(Modelo.create).not.toHaveBeenCalled();
  });

  it('edita parcial y reemplaza la imagen (borra la anterior)', async () => {
    const res = await request(app).put('/admin/1').set('x-access-token', ADMIN).set('x-test-imagen', 'b.png').send({ precio: '' });
    expect(res.body.data).toMatchObject({ nombre: 'Limpieza de oficinas', precio: null });
    expect(borrarImagen).toHaveBeenCalledWith('a.jpg');
  });

  it('DELETE despublica sin borrar', async () => {
    const res = await request(app).delete('/admin/1').set('x-access-token', ADMIN);
    expect(res.body.data.publicado).toBe(false);
    expect(mockFilas.find((f) => f.id === 1)).toBeTruthy();
  });

  it('DELETE /:id/eliminar rechaza un ítem publicado (409) sin borrarlo', async () => {
    const res = await request(app).delete('/admin/1/eliminar').set('x-access-token', ADMIN);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ITEM_PUBLICADO');
    expect(mockFilas.find((f) => f.id === 1)).toBeTruthy();
  });

  it('DELETE /:id/eliminar borra un ítem despublicado y su imagen', async () => {
    mockFilas.find((f) => f.id === 1).publicado = false;
    const res = await request(app).delete('/admin/1/eliminar').set('x-access-token', ADMIN);
    expect(res.status).toBe(200);
    expect(mockFilas.find((f) => f.id === 1)).toBeUndefined();
    expect(borrarImagen).toHaveBeenCalledWith('a.jpg');
    expect((await request(app).delete('/admin/2/eliminar').set('x-access-token', OPERACIONES)).status).toBe(403);
  });

  it('id inexistente 404, id inválido 400', async () => {
    expect((await request(app).get('/admin/99').set('x-access-token', ADMIN)).status).toBe(404);
    expect((await request(app).get('/admin/abc').set('x-access-token', ADMIN)).status).toBe(400);
  });

  it('PATCH /orden reordena en una transacción', async () => {
    const res = await request(app).patch('/admin/orden').set('x-access-token', ADMIN).send({ ids: [1, 3, 2] });
    expect(res.status).toBe(200);
    expect(res.body.data.map((i) => i.id)).toEqual([1, 3, 2]);
    expect(db.sequelize.transaction).toHaveBeenCalled();
  });

  it('PATCH /orden rechaza repetidos (400) y ids inexistentes (404) sin cambiar nada', async () => {
    expect((await request(app).patch('/admin/orden').set('x-access-token', ADMIN).send({ ids: [1, 1] })).status).toBe(400);
    expect((await request(app).patch('/admin/orden').set('x-access-token', ADMIN).send({ ids: [1, 99] })).status).toBe(404);
    expect(Modelo.update).not.toHaveBeenCalled();
  });
});

describe('público', () => {
  it('sin sesión, solo publicados, en orden, sin campos internos y con caché corta', async () => {
    const res = await request(app).get('/public/catalogo');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.data.map((i) => i.id)).toEqual([3, 1]);
    expect(Object.keys(res.body.data[1]).sort()).toEqual(['categoria', 'descripcion', 'id', 'imagen_url', 'nombre', 'orden', 'precio']);
    expect(res.body.data[1].precio).toBe(15000);
  });

  it('despublicar lo oculta de inmediato', async () => {
    await request(app).delete('/admin/3').set('x-access-token', ADMIN);
    const res = await request(app).get('/public/catalogo');
    expect(res.body.data.map((i) => i.id)).toEqual([1]);
  });
});
