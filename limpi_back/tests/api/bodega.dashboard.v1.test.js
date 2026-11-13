/**
 * RF-BOD-05 — Capa HTTP del dashboard y del stock mínimo: acceso por rol (JWT real), validación y formato §2.6.
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/dashboard', () => ({
  obtener: jest.fn(async () => ({ data: { solicitudes: {}, lista_compra: {}, stock: {}, ordenes_transito: {} }, meta: { duracion_ms: 5 } })),
  actualizarStockMinimo: jest.fn(async (id, valor) => ({ id: id, stock_minimo: valor }))
}));
// El router también carga los controladores de RF-BOD-01/02/03/04 (servicios simulados).
jest.mock('../../services/bodega/solicitudes', () => ({}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../services/bodega/cruceStock', () => ({}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const dashboard = require('../../services/bodega/dashboard');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-05';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 2, correo: 'u2@prueba.cl', roleId: 2 }, CLAVE);
const OTRO_ROL = jwt.sign({ id: 5, correo: 'u5@prueba.cl', roleId: 5 }, CLAVE);
const SUPERVISOR = jwt.sign({ id: 4, tipo_acceso: 1 }, CLAVE);

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/bodega', router);
  a.use(noEncontrado);
  a.use(manejadorErrores);
  return a;
}
const llamar = (metodo, ruta, token, body) => {
  let r = request(app())[metodo]('/api/v1/bodega' + ruta);
  if (token) r = r.set('x-access-token', token);
  return body === undefined ? r : r.send(body);
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());
beforeEach(() => { process.env.SECRET_KEY = CLAVE; jest.clearAllMocks(); });

const RUTAS = [['get', '/dashboard', undefined], ['patch', '/productos/5/stock-minimo', { stock_minimo: 3 }]];

describe('acceso por rol (spec §2.3: dashboard solo Admin y Operaciones)', () => {
  it.each(RUTAS)('%s %s: Administrador -> 200', async (m, ruta, body) => {
    expect((await llamar(m, ruta, ADMIN, body)).status).toBe(200);
  });
  it.each(RUTAS)('%s %s: Operaciones -> 200', async (m, ruta, body) => {
    expect((await llamar(m, ruta, OPERACIONES, body)).status).toBe(200);
  });
  it.each(RUTAS)('%s %s: supervisor -> 403', async (m, ruta, body) => {
    const r = await llamar(m, ruta, SUPERVISOR, body);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });
  it.each(RUTAS)('%s %s: otro rol -> 403', async (m, ruta, body) => {
    expect((await llamar(m, ruta, OTRO_ROL, body)).status).toBe(403);
  });
  it.each(RUTAS)('%s %s: sin token -> 401', async (m, ruta, body) => {
    expect((await llamar(m, ruta, null, body)).status).toBe(401);
  });
});

describe('GET /dashboard', () => {
  it('responde { ok, data, meta } con los 4 bloques', async () => {
    const r = await llamar('get', '/dashboard', ADMIN);
    expect(r.body).toEqual({ ok: true, data: { solicitudes: {}, lista_compra: {}, stock: {}, ordenes_transito: {} }, meta: { duracion_ms: 5 } });
  });
});

describe('PATCH /productos/:id/stock-minimo', () => {
  it('acepta 0 (sin alerta) y pasa usuario con contexto', async () => {
    const r = await llamar('patch', '/productos/5/stock-minimo', OPERACIONES, { stock_minimo: 0 });
    expect(r.body).toEqual({ ok: true, data: { id: 5, stock_minimo: 0 }, meta: {} });
    expect(dashboard.actualizarStockMinimo).toHaveBeenCalledWith(5, 0, { id: 2, contexto: 'usuarios' }, expect.anything());
  });

  it.each([
    ['negativo', { stock_minimo: -1 }],
    ['decimal', { stock_minimo: 1.5 }],
    ['texto', { stock_minimo: '3' }],
    ['ausente', {}],
    ['excesivo', { stock_minimo: 1000001 }]
  ])('stock_minimo %s -> 400 sin llamar al servicio', async (nombre, body) => {
    const r = await llamar('patch', '/productos/5/stock-minimo', ADMIN, body);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(dashboard.actualizarStockMinimo).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5'])('id %s -> 400', async (id) => {
    expect((await llamar('patch', '/productos/' + id + '/stock-minimo', ADMIN, { stock_minimo: 1 })).status).toBe(400);
    expect(dashboard.actualizarStockMinimo).not.toHaveBeenCalled();
  });

  it('errores del servicio salen con su código (404 inexistente, 409 inactivo)', async () => {
    const AppError = require('../../libs/app-error');
    dashboard.actualizarStockMinimo.mockRejectedValueOnce(new AppError('PRODUCTO_NO_EXISTE', 'no existe', 404, { id: 99 }));
    const r404 = await llamar('patch', '/productos/99/stock-minimo', ADMIN, { stock_minimo: 1 });
    expect(r404.status).toBe(404);
    expect(r404.body).toMatchObject({ ok: false, error: { code: 'PRODUCTO_NO_EXISTE' } });
    dashboard.actualizarStockMinimo.mockRejectedValueOnce(new AppError('PRODUCTO_INACTIVO', 'inactivo', 409, { id: 2 }));
    expect((await llamar('patch', '/productos/2/stock-minimo', ADMIN, { stock_minimo: 1 })).status).toBe(409);
  });
});
