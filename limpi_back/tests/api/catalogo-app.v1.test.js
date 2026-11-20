/**
 * RF-WEB-01b — Vínculo del catálogo web con los servicios de la app de reservas.
 */
const mockFilas = [];
const mockServicios = [];
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async () => ({ nombre: 'Administrador' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../libs/multer_publicaciones', () => ({
  subirImagen: () => (req, res, next) => next(),
  validarMagicBytes: jest.fn(async () => true),
  borrarImagen: jest.fn()
}));
jest.mock('../../modelos/sist_app/Servicio', () => ({
  findAll: jest.fn(async ({ where } = {}) => mockServicios.filter((s) => !where || where.id.includes(s.id))),
  findById: jest.fn(async (id) => mockServicios.find((s) => s.id === id) || null)
}));
jest.mock('../../modelos/sistema_web/Catalogo_item', () => {
  const instancia = (data) => Object.assign(data, { update: jest.fn(async (c) => Object.assign(data, c)), get: () => Object.assign({}, data) });
  return {
    instancia,
    findAll: jest.fn(async ({ where } = {}) => mockFilas.filter((f) => !where || f.publicado === where.publicado).sort((a, b) => a.orden - b.orden)),
    findById: jest.fn(async (id) => mockFilas.find((f) => f.id === id) || null),
    max: jest.fn(async () => mockFilas.reduce((m, f) => Math.max(m, f.orden), 0)),
    create: jest.fn(async (c) => { const f = instancia(Object.assign({ id: 50 + mockFilas.length }, c)); mockFilas.push(f); return f; })
  };
});

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('../../config/auth');
const Modelo = require('../../modelos/sistema_web/Catalogo_item');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const ADMIN = jwt.sign({ id: 1, roleId: 1 }, process.env.SECRET_KEY);
const app = express();
app.use(express.json());
app.use('/admin', autenticar, requerirRol('Administrador'), require('../../api/v1/web/catalogo/routes'));
app.use('/public', require('../../api/v1/public/routes'));
app.use(noEncontrado);
app.use(manejadorErrores);
const admin = (m, ruta) => request(app)[m](ruta).set('x-access-token', ADMIN);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.APP_RESERVAS_URL = 'https://ejemplo.test/app';
  mockServicios.length = 0;
  mockServicios.push(
    { id: 10, nombre: 'Lavado de autos', descripcion: 'Lavado completo', precio: 30000, estado: 1, imagen: null },
    { id: 11, nombre: 'Servicio antiguo', descripcion: null, precio: 9990, estado: 0, imagen: null }
  );
  mockFilas.length = 0;
  [
    { id: 1, nombre: 'Propio de la web', precio: '45000', publicado: true, orden: 1, servicio_id: null },
    { id: 2, nombre: 'Vinculado activo', precio: null, publicado: true, orden: 2, servicio_id: 10 },
    { id: 3, nombre: 'Vinculado inactivo', precio: null, publicado: true, orden: 3, servicio_id: 11 }
  ].forEach((f) => mockFilas.push(Modelo.instancia(Object.assign({ descripcion: null, categoria: null, imagen: null }, f))));
});
afterAll(() => { delete process.env.APP_RESERVAS_URL; });

describe('público', () => {
  it('vinculado activo: precio en vivo de la app, reservable y con enlace; inactivo: sin precio ni reserva', async () => {
    const res = await request(app).get('/public/catalogo');
    const [propio, activo, inactivo] = res.body.data;
    expect(propio).not.toHaveProperty('reservable_en_app');
    expect(propio.precio).toBe(45000);
    expect(activo).toMatchObject({ precio: 30000, reservable_en_app: true, reserva_url: 'https://ejemplo.test/app' });
    expect(inactivo).toMatchObject({ precio: null, reservable_en_app: false, reserva_url: null });
    expect(JSON.stringify(res.body)).not.toMatch(/servicio_id|estado|servicio_app/);
  });

  it('cambiar el precio en la app se refleja sin tocar el catálogo', async () => {
    mockServicios[0].precio = 35000;
    const res = await request(app).get('/public/catalogo');
    expect(res.body.data[1].precio).toBe(35000);
  });

  it('sin APP_RESERVAS_URL no se ofrece reservar (la app no está operativa), pero el precio en vivo sigue', async () => {
    delete process.env.APP_RESERVAS_URL;
    const res = await request(app).get('/public/catalogo');
    expect(res.body.data[1]).toMatchObject({ precio: 30000, reservable_en_app: false, reserva_url: null });
  });
});

describe('administración', () => {
  it('lista con servicio vinculado y aviso si el servicio está inactivo', async () => {
    const res = await admin('get', '/admin');
    expect(res.body.data[1].servicio_app).toEqual({ id: 10, nombre: 'Lavado de autos', precio: 30000, activo: true });
    expect(res.body.data[2].aviso_app).toMatch(/inactivo/);
    expect(res.body.data[0]).toMatchObject({ servicio_id: null, servicio_app: null, aviso_app: null });
  });

  it('GET /servicios-app lista los servicios sin datos internos', async () => {
    const res = await admin('get', '/admin/servicios-app');
    expect(res.body.data).toEqual([
      { id: 10, nombre: 'Lavado de autos', precio: 30000, activo: true },
      { id: 11, nombre: 'Servicio antiguo', precio: 9990, activo: false }
    ]);
  });

  it('vincular borra el precio propio y desvincular lo deja sin precio', async () => {
    let res = await admin('put', '/admin/1/servicio-app').send({ servicio_id: 10 });
    expect(res.status).toBe(200);
    expect(mockFilas[0]).toMatchObject({ servicio_id: 10, precio: null });
    expect(res.body.data.precio).toBe(30000);
    res = await admin('put', '/admin/1/servicio-app').send({ servicio_id: null });
    expect(mockFilas[0].servicio_id).toBe(null);
    expect(res.body.data.precio).toBe(null);
  });

  it('vincular valida: falta (400), inválido (400), servicio inexistente (404)', async () => {
    expect((await admin('put', '/admin/1/servicio-app').send({})).status).toBe(400);
    expect((await admin('put', '/admin/1/servicio-app').send({ servicio_id: 'x' })).status).toBe(400);
    expect((await admin('put', '/admin/1/servicio-app').send({ servicio_id: 99 })).status).toBe(404);
    expect((await admin('put', '/admin/99/servicio-app').send({ servicio_id: 10 })).status).toBe(404);
  });

  it('un ítem vinculado no acepta precio propio (400) pero sí precio vacío', async () => {
    const res = await admin('put', '/admin/2').send({ precio: '20000' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRECIO_DESDE_APP');
    expect((await admin('put', '/admin/2').send({ precio: '', nombre: 'Lavado premium' })).status).toBe(200);
  });

  it('importar crea un borrador vinculado, al final y sin precio propio', async () => {
    const res = await admin('post', '/admin/importar-servicio').send({ servicio_id: 10 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Lavado de autos', descripcion: 'Lavado completo', publicado: false, orden: 4, servicio_id: 10, precio: 30000 });
    expect(Modelo.create.mock.calls[0][0]).toMatchObject({ precio: null, servicio_id: 10, imagen: null });
  });

  it('importar un servicio inexistente responde 404 sin crear nada', async () => {
    expect((await admin('post', '/admin/importar-servicio').send({ servicio_id: 99 })).status).toBe(404);
    expect(Modelo.create).not.toHaveBeenCalled();
  });
});
