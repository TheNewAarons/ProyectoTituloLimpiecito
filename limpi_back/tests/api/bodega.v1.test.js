/**
 * RF-BOD-01 — Capa HTTP de /api/v1/bodega (routes + controlador + auth-bodega) con jsonwebtoken real.
 * El servicio se simula (su lógica se cubre en tests/services/bodega): aquí se verifica cableado, permisos,
 * validación en el borde y formato { ok, data, meta } / { ok:false, error } (spec §2.6).
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => (id === 1 ? { nombre: 'Administrador' } : { nombre: 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/solicitudes', () => ({
  listarProductosSolicitables: jest.fn(async () => [{ id: 1, nombre: 'Guantes' }]),
  listarCentrosPermitidos: jest.fn(async () => [{ id: 10, numero_cc: 100, cliente: 'Cliente' }]),
  crear: jest.fn(async (entrada) => ({ id: 1, estado: 'PENDIENTE', items: entrada.items })),
  listar: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })),
  listarMias: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })),
  obtener: jest.fn(async (id) => ({ id: id })),
  anular: jest.fn(async (id) => ({ id: id, estado: 'ANULADA' }))
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const Usuario = require('../../modelos/sistema_base/Usuario');
const servicio = require('../../services/bodega/solicitudes');
const AppError = require('../../libs/app-error');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-01';
const ADMIN = jwt.sign({ id: 1, correo: 'admin@prueba.cl', roleId: 1 }, CLAVE);
const OTRO_ROL = jwt.sign({ id: 2, correo: 'otro@prueba.cl', roleId: 2 }, CLAVE);
const SUPERVISOR = jwt.sign({ id: 7, tipo_acceso: 1 }, CLAVE);

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
beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  Usuario.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, correo: 'admin@prueba.cl', roleId: 1, estado: 1 } : { id: 2, correo: 'otro@prueba.cl', roleId: 2, estado: 1 }));
});

describe('permisos por ruta (spec §2.3)', () => {
  it.each([
    ['get', '/productos/solicitables'], ['get', '/centros-costo/permitidos'], ['get', '/solicitudes/mias'], ['get', '/solicitudes/1']
  ])('%s %s: supervisor y admin -> 200', async (metodo, ruta) => {
    expect((await llamar(metodo, ruta, SUPERVISOR)).status).toBe(200);
    expect((await llamar(metodo, ruta, ADMIN)).status).toBe(200);
  });

  it('GET /solicitudes (listado admin): supervisor -> 403', async () => {
    const r = await llamar('get', '/solicitudes', SUPERVISOR);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('PATCH /solicitudes/:id/estado no existe en RF-BOD-01 -> 404', async () => {
    expect((await llamar('patch', '/solicitudes/1/estado', ADMIN, { estado: 'ENTREGADA' })).status).toBe(404);
  });

  it('usuario intranet sin rol de bodega -> 403', async () => {
    expect((await llamar('get', '/solicitudes/mias', OTRO_ROL)).status).toBe(403);
  });

  it('sin token -> 401', async () => {
    expect((await llamar('get', '/solicitudes/mias')).status).toBe(401);
  });

  it('pasa al servicio el usuario con su contexto', async () => {
    await llamar('get', '/solicitudes/mias', SUPERVISOR);
    expect(servicio.listarMias.mock.calls[0][1]).toMatchObject({ id: 7, contexto: 'acceso_trabajadores' });
  });
});

describe('POST /solicitudes: validación en el borde', () => {
  const valida = { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 2 }], observacion: '  urgente  ' };

  it('crea -> 201 con formato { ok, data, meta }', async () => {
    const r = await llamar('post', '/solicitudes', SUPERVISOR, valida);
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, data: expect.objectContaining({ id: 1 }), meta: { acciones: { puede_anular: true } } });
    expect(servicio.crear.mock.calls[0][0]).toEqual({ centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 2 }], observacion: 'urgente' });
  });

  it('suma productos repetidos (regla 4)', async () => {
    await llamar('post', '/solicitudes', SUPERVISOR, { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 1, cantidad: 3 }] });
    expect(servicio.crear.mock.calls[0][0].items).toEqual([{ producto_id: 1, cantidad: 5 }]);
  });

  it.each([
    ['sin items', { centro_costo_id: 10, items: [] }],
    ['items no es lista', { centro_costo_id: 10, items: 'x' }],
    ['cantidad 0', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 0 }] }],
    ['cantidad negativa', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: -3 }] }],
    ['cantidad decimal', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 1.5 }] }],
    ['cantidad como texto', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: '3' }] }],
    ['cantidad excesiva', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 100001 }] }],
    ['producto_id inválido', { centro_costo_id: 10, items: [{ producto_id: 'abc', cantidad: 1 }] }],
    ['sin centro de costo', { items: [{ producto_id: 1, cantidad: 1 }] }],
    ['observación muy larga', { centro_costo_id: 10, items: [{ producto_id: 1, cantidad: 1 }], observacion: 'x'.repeat(501) }]
  ])('%s -> 400 VALIDATION_ERROR y no llama al servicio', async (nombre, body) => {
    const r = await llamar('post', '/solicitudes', SUPERVISOR, body);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('errores del servicio salen con su código (p. ej. 403 CENTRO_NO_PERMITIDO)', async () => {
    servicio.crear.mockRejectedValueOnce(new AppError('CENTRO_NO_PERMITIDO', 'no asignado', 403, { centro_costo_id: 10 }));
    const r = await llamar('post', '/solicitudes', SUPERVISOR, valida);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'CENTRO_NO_PERMITIDO', details: { centro_costo_id: 10 } } });
  });
});

describe('listados, detalle y cambios', () => {
  it('GET /solicitudes con filtros y paginación', async () => {
    const r = await llamar('get', '/solicitudes?estado=PARCIAL,LISTA_ENTREGA&centro_costo_id=10&page=2&limit=5', ADMIN);
    expect(r.status).toBe(200);
    expect(r.body.meta).toEqual({ page: 2, limit: 5, total: 0 });
    expect(servicio.listar.mock.calls[0][0]).toEqual({ page: 2, limit: 5, estados: ['PARCIAL', 'LISTA_ENTREGA'], centro_costo_id: 10 });
  });

  it.each(['estado=OTRO', 'estado=PARCIAL,OTRO', 'limit=500', 'page=0', 'page=10001', 'centro_costo_id=abc'])('GET /solicitudes?%s -> 400', async (q) => {
    expect((await llamar('get', '/solicitudes?' + q, ADMIN)).status).toBe(400);
  });

  it('id no numérico -> 400', async () => {
    expect((await llamar('get', '/solicitudes/abc', ADMIN)).status).toBe(400);
  });

  it('PATCH anular pasa el motivo', async () => {
    const r = await llamar('patch', '/solicitudes/3/anular', SUPERVISOR, { motivo: ' error ' });
    expect(r.status).toBe(200);
    expect(servicio.anular).toHaveBeenCalledWith(3, 'error', expect.objectContaining({ id: 7 }), expect.anything());
  });

  it('meta.acciones: admin anula si no está finalizada; supervisor solo si está PENDIENTE', async () => {
    servicio.obtener.mockResolvedValue({ id: 3, estado: 'PARCIAL' });
    expect((await llamar('get', '/solicitudes/3', ADMIN)).body.meta.acciones).toEqual({ puede_anular: true });
    expect((await llamar('get', '/solicitudes/3', SUPERVISOR)).body.meta.acciones).toEqual({ puede_anular: false });
    servicio.obtener.mockResolvedValue({ id: 3, estado: 'ENTREGADA' });
    expect((await llamar('get', '/solicitudes/3', ADMIN)).body.meta.acciones).toEqual({ puede_anular: false });
  });

  it('ruta inexistente bajo /api/v1/bodega -> 404 JSON', async () => {
    const r = await llamar('get', '/nada', ADMIN);
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
