/**
 * RF-BOD-04 — Capa HTTP de recepción, entrega, formato de entrega y movimientos (routes + recepcion-controlador
 * + auth-bodega) con jsonwebtoken real. Los servicios se simulan (su lógica: tests/services/bodega/{recepcion,entrega}).
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/recepcion', () => ({ recibir: jest.fn(async (id) => ({ orden_id: id, estado: 'RECIBIDA' })) }));
jest.mock('../../services/bodega/entrega', () => ({
  entregar: jest.fn(async (id) => ({ id: id, estado: 'ENTREGADA' })),
  formatoEntrega: jest.fn(async (id) => ({ numero: id, items: [] }))
}));
jest.mock('../../services/bodega/movimientos', () => ({ listar: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })) }));
jest.mock('../../services/bodega/ordenesConsulta', () => ({
  listar: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })),
  detalleRecepcion: jest.fn(async (id) => ({ id: id, items: [] }))
}));
// El router también carga los controladores de RF-BOD-01/02/03: sus servicios se simulan (como en bodega-cruce.v1.test.js).
jest.mock('../../services/bodega/solicitudes', () => ({}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../services/bodega/cruceStock', () => ({}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const recepcion = require('../../services/bodega/recepcion');
const entrega = require('../../services/bodega/entrega');
const movimientos = require('../../services/bodega/movimientos');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-04';
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

const ordenesConsulta = require('../../services/bodega/ordenesConsulta');

const RUTAS = [
  ['get', '/ordenes-compra'],
  ['get', '/ordenes-compra/10/recepcion'],
  ['post', '/ordenes-compra/10/recepcion'],
  ['post', '/solicitudes/1/entregar'],
  ['get', '/solicitudes/1/formato-entrega'],
  ['get', '/movimientos']
];

describe('permisos (Admin y Operaciones)', () => {
  it.each(RUTAS)('%s %s: Admin y Operaciones -> 200', async (metodo, ruta) => {
    expect((await llamar(metodo, ruta, ADMIN, {})).status).toBe(200);
    expect((await llamar(metodo, ruta, OPERACIONES, {})).status).toBe(200);
  });

  it.each(RUTAS)('%s %s: supervisor -> 403', async (metodo, ruta) => {
    const r = await llamar(metodo, ruta, SUPERVISOR, {});
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it.each(RUTAS)('%s %s: otro rol -> 403, sin token -> 401', async (metodo, ruta) => {
    expect((await llamar(metodo, ruta, OTRO_ROL, {})).status).toBe(403);
    expect((await llamar(metodo, ruta, null, {})).status).toBe(401);
  });
});

describe('POST /ordenes-compra/:id/recepcion', () => {
  it('sin items recibe todo lo pendiente (pasa null al servicio) y responde { ok, data, meta }', async () => {
    const r = await llamar('post', '/ordenes-compra/10/recepcion', ADMIN, {});
    expect(r.body).toEqual({ ok: true, data: { orden_id: 10, estado: 'RECIBIDA' }, meta: {} });
    expect(recepcion.recibir).toHaveBeenCalledWith(10, null, expect.objectContaining({ usuario: { id: 1, contexto: 'usuarios' } }));
  });

  it('acepta 0 por línea', async () => {
    await llamar('post', '/ordenes-compra/10/recepcion', ADMIN, { items: [{ item_id: 100, cantidad_recibida: 0 }, { item_id: 101, cantidad_recibida: 4 }] });
    expect(recepcion.recibir.mock.calls[0][1]).toEqual([{ item_id: 100, cantidad_recibida: 0 }, { item_id: 101, cantidad_recibida: 4 }]);
  });

  it.each([
    ['cantidad negativa', { items: [{ item_id: 100, cantidad_recibida: -1 }] }],
    ['cantidad decimal', { items: [{ item_id: 100, cantidad_recibida: 1.5 }] }],
    ['cantidad como texto', { items: [{ item_id: 100, cantidad_recibida: '3' }] }],
    ['item_id repetido', { items: [{ item_id: 100, cantidad_recibida: 1 }, { item_id: 100, cantidad_recibida: 2 }] }],
    ['item_id inválido', { items: [{ item_id: 'x', cantidad_recibida: 1 }] }],
    ['items vacío', { items: [] }]
  ])('%s -> 400 VALIDATION_ERROR sin llamar al servicio', async (nombre, body) => {
    const r = await llamar('post', '/ordenes-compra/10/recepcion', ADMIN, body);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(recepcion.recibir).not.toHaveBeenCalled();
  });

  it('id no numérico -> 400', async () => {
    expect((await llamar('post', '/ordenes-compra/abc/recepcion', ADMIN, {})).status).toBe(400);
  });
});

describe('entrega y formato', () => {
  it('POST entregar pasa el usuario con su contexto', async () => {
    const r = await llamar('post', '/solicitudes/7/entregar', OPERACIONES, {});
    expect(r.body).toEqual({ ok: true, data: { id: 7, estado: 'ENTREGADA' }, meta: {} });
    expect(entrega.entregar).toHaveBeenCalledWith(7, { id: 2, contexto: 'usuarios' }, expect.anything());
  });

  it('GET formato-entrega', async () => {
    const r = await llamar('get', '/solicitudes/7/formato-entrega', ADMIN);
    expect(r.body.data).toEqual({ numero: 7, items: [] });
  });
});

describe('GET /ordenes-compra (listado y detalle para recepción)', () => {
  it('filtra por uno o varios estados', async () => {
    await llamar('get', '/ordenes-compra?estado=ENVIADA,RECIBIDA_PARCIAL', ADMIN);
    expect(ordenesConsulta.listar).toHaveBeenCalledWith({ estados: ['ENVIADA', 'RECIBIDA_PARCIAL'], page: 1, limit: 50 });
  });

  it('estado inválido -> 400', async () => {
    expect((await llamar('get', '/ordenes-compra?estado=ENVIADA,OTRO', ADMIN)).status).toBe(400);
  });

  it('GET /:id/recepcion no choca con GET /:id de RF-BOD-03', async () => {
    const r = await llamar('get', '/ordenes-compra/10/recepcion', ADMIN);
    expect(r.body.data).toEqual({ id: 10, items: [] });
    expect(ordenesConsulta.detalleRecepcion).toHaveBeenCalledWith(10);
  });
});

describe('GET /movimientos', () => {
  it('filtros y paginación por defecto', async () => {
    const r = await llamar('get', '/movimientos?producto_id=5&desde=2026-11-01&hasta=2026-11-09&tipo=ENTRADA_COMPRA', ADMIN);
    expect(r.status).toBe(200);
    expect(movimientos.listar).toHaveBeenCalledWith({ producto_id: 5, tipo: 'ENTRADA_COMPRA', desde: '2026-11-01', hasta: '2026-11-09', page: 1, limit: 50 });
    expect(r.body.meta).toEqual({ page: 1, limit: 50, total: 0 });
  });

  it.each(['desde=2026-13-01', 'hasta=09-11-2026', 'desde=2026-11-10&hasta=2026-11-01', 'tipo=OTRO', 'producto_id=abc', 'limit=1000', 'page=0'])(
    '?%s -> 400', async (q) => {
      expect((await llamar('get', '/movimientos?' + q, ADMIN)).status).toBe(400);
      expect(movimientos.listar).not.toHaveBeenCalled();
    });
});
