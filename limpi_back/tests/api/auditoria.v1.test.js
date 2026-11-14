/**
 * RNF-SEC-02 — Capa HTTP: api/v1/auditoria (solo lectura, solo Admin). El cableado de
 * autenticar + requerirRol(Admin) se aplica a nivel de app.use del path (igual que index.js),
 * por lo que los verbos de escritura SIN token dan 401 y CON token Admin caen al 404 JSON.
 */
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Auditoria', () => ({ findAndCountAll: jest.fn(), findById: jest.fn(), create: jest.fn() }));
jest.mock('../../modelos/sistema_bodega/Movimiento_bodega', () => ({}));
jest.mock('../../modelos/sistema_base/Producto', () => ({}));

const express = require('express');
const request = require('supertest');
const Op = require('sequelize').Op;

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Auditoria = require('../../modelos/sistema_base/Auditoria');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');
const router = require('../../api/v1/auditoria/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auditoria', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), router);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';

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

const FILA = {
  id: 2, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'egresos', entidad_id: '5',
  accion: 'PAGO', valores_antes: '{"estado":"PENDIENTE"}', valores_despues: '{"estado":"PAGADA"}',
  motivo: null, ip: null, created_at: '2026-03-10T00:00:00.000Z'
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

describe('API /api/v1/auditoria', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    configurarJwtYRol();
    app = buildApp();
  });

  const get = (ruta, token) => {
    const r = request(app).get('/api/v1/auditoria' + ruta);
    return token ? r.set('x-access-token', token) : r;
  };

  describe('autenticacion/autorizacion', () => {
    it('sin token -> 401 TOKEN_REQUERIDO', async () => {
      const res = await get('/');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    });

    it('token no-Admin -> 403 FORBIDDEN', async () => {
      const res = await get('/', TOKEN_RRHH);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    });

    it('sin token en /:id -> 401 TOKEN_REQUERIDO', async () => {
      const res = await get('/5');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    });

    it('token no-Admin en /:id -> 403 FORBIDDEN', async () => {
      const res = await get('/5', TOKEN_RRHH);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    });
  });

  describe('GET / (listado)', () => {
    it('Admin -> 200 con lista y meta {page,limit,total}, valores parseados', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({ count: 1, rows: [FILA] });
      const res = await get('/', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, meta: { page: 1, limit: 20, total: 1 } });
      expect(res.body.data[0].valores_antes).toEqual({ estado: 'PENDIENTE' });
      expect(res.body.data[0].valores_despues).toEqual({ estado: 'PAGADA' });
    });

    it('entidad filtra por where.entidad', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await get('/?entidad=egresos', TOKEN_ADMIN);
      expect(Auditoria.findAndCountAll.mock.calls[0][0].where.entidad).toBe('egresos');
    });

    it('entidad_id sin entidad -> 400 CAMPO_INVALIDO', async () => {
      const res = await get('/?entidad_id=5', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
      expect(Auditoria.findAndCountAll).not.toHaveBeenCalled();
    });

    it('usuario_id -> contexto_usuario por defecto "usuarios" (D-076)', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await get('/?usuario_id=7', TOKEN_ADMIN);
      expect(Auditoria.findAndCountAll.mock.calls[0][0].where).toMatchObject({ usuario_id: 7, contexto_usuario: 'usuarios' });
    });

    it('contexto_usuario inválido -> 400 CAMPO_INVALIDO', async () => {
      const res = await get('/?contexto_usuario=inventado', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
      expect(Auditoria.findAndCountAll).not.toHaveBeenCalled();
    });

    it.each(['desde=2026-13-01', 'hasta=20260301', 'desde=01-03-2026'])('fecha inválida (%s) -> 400 CAMPO_INVALIDO', async (q) => {
      const res = await get('/?' + q, TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
    });

    it('desde > hasta -> 400 CAMPO_INVALIDO', async () => {
      const res = await get('/?desde=2026-03-31&hasta=2026-03-01', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
    });

    it('desde/hasta: hasta INCLUSIVO (created_at [gte, lt) con inicioDiaSantiago)', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await get('/?desde=2026-03-01&hasta=2026-03-31', TOKEN_ADMIN);
      const creado = Auditoria.findAndCountAll.mock.calls[0][0].where.created_at;
      expect(creado[Op.gte]).toBeInstanceOf(Date);
      expect(creado[Op.lt]).toBeInstanceOf(Date);
    });

    it.each(['limit=101', 'limit=0', 'page=0', 'page=-1'])('paginado inválido (%s) -> 400 CAMPO_INVALIDO', async (q) => {
      const res = await get('/?' + q, TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
    });

    it('page/limit válidos se reflejan en meta y offset', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const res = await get('/?page=2&limit=5', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 2, limit: 5, total: 0 });
      expect(Auditoria.findAndCountAll.mock.calls[0][0]).toMatchObject({ limit: 5, offset: 5 });
    });

    it('page por sobre el tope (1000000) -> 400 CAMPO_INVALIDO', async () => {
      const res = await get('/?page=1000001', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
      expect(Auditoria.findAndCountAll).not.toHaveBeenCalled();
    });

    it('page/usuario_id fuera de entero seguro -> 400 CAMPO_INVALIDO', async () => {
      for (const q of ['page=9007199254740992', 'usuario_id=9007199254740992']) {
        const res = await get('/?' + q, TOKEN_ADMIN);
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
      }
      expect(Auditoria.findAndCountAll).not.toHaveBeenCalled();
    });

    it('limpia claves sensibles al serializar filas antiguas (valores_despues)', async () => {
      Auditoria.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [Object.assign({}, FILA, { valores_despues: '{"estado":"PAGADA","password":"secreto","x-access-token":"t"}' })]
      });
      const res = await get('/', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.data[0].valores_despues).toEqual({ estado: 'PAGADA' });
    });
  });

  describe('GET /:id (detalle)', () => {
    it('id no numérico -> 400 CAMPO_INVALIDO', async () => {
      const res = await get('/abc', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
      expect(Auditoria.findById).not.toHaveBeenCalled();
    });

    it('Admin -> 200 con valores parseados (antes null si es null)', async () => {
      Auditoria.findById.mockResolvedValue(Object.assign({}, FILA, { id: 9, valores_despues: null }));
      const res = await get('/9', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: { id: 9, accion: 'PAGO' } });
      expect(res.body.data.valores_antes).toEqual({ estado: 'PENDIENTE' });
      expect(res.body.data.valores_despues).toBeNull();
    });

    it('no existe -> 404 NO_ENCONTRADO', async () => {
      Auditoria.findById.mockResolvedValue(null);
      const res = await get('/999', TOKEN_ADMIN);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'NO_ENCONTRADO' } });
    });
  });

  describe('verbos de escritura (404 JSON)', () => {
    it.each(['post', 'put', 'patch', 'delete'])('%s /api/v1/auditoria y /api/v1/auditoria/:id -> 404 NOT_FOUND (token Admin)', async (metodo) => {
      for (const ruta of ['', '/5']) {
        const res = await request(app)[metodo]('/api/v1/auditoria' + ruta).set('x-access-token', TOKEN_ADMIN);
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
      }
    });
  });
});
