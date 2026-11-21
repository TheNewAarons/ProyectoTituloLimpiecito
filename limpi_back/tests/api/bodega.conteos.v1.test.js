/**
 * RF-BOD-07 — Capa HTTP del conteo físico (routes + conteos-controlador + auth-bodega) con jsonwebtoken real.
 * El servicio se simula (su lógica: tests/services/bodega/conteos.test.js).
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/conteos', () => {
  const AppError = require('../../libs/app-error');
  return {
    crear: jest.fn(async () => ({ id: 1, estado: 'BORRADOR', items_total: 2 })),
    listar: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })),
    obtener: jest.fn(async (id) => ({ id: id, items: [] })),
    capturar: jest.fn(async (id) => ({ id: id, items: [] })),
    anular: jest.fn(async (id) => ({ id: id, estado: 'ANULADO' })),
    aprobar: jest.fn(async (id) => {
      if (id === 9) throw new AppError('CONTEO_NO_EDITABLE', 'solo se modifica un conteo en BORRADOR', 409, { estado: 'APROBADO' });
      return { conteo: { id: id, estado: 'APROBADO' }, ajustes: [], recalculados: [] };
    })
  };
});
// El router también carga los demás controladores de bodega: sus servicios se simulan (como en bodega.recepcion.v1.test.js).
jest.mock('../../services/bodega/solicitudes', () => ({}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../services/bodega/cruceStock', () => ({}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const conteos = require('../../services/bodega/conteos');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-07';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 2, correo: 'u2@prueba.cl', roleId: 2 }, CLAVE);
const OTRO_ROL = jwt.sign({ id: 5, correo: 'u5@prueba.cl', roleId: 5 }, CLAVE);

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

describe('permisos', () => {
  it.each([
    ['get', '/conteos'], ['post', '/conteos'], ['get', '/conteos/1'], ['patch', '/conteos/1/items'],
    ['patch', '/conteos/1/anular'], ['post', '/conteos/1/aprobar']
  ])('%s %s sin token responde 401 y con otro rol 403', async (metodo, ruta) => {
    expect((await llamar(metodo, ruta)).status).toBe(401);
    expect((await llamar(metodo, ruta, OTRO_ROL, {})).status).toBe(403);
  });

  it('Operaciones captura pero no aprueba', async () => {
    expect((await llamar('post', '/conteos', OPERACIONES, {})).status).toBe(201);
    const r = await llamar('post', '/conteos/1/aprobar', OPERACIONES, {});
    expect(r.status).toBe(403);
    expect(conteos.aprobar).not.toHaveBeenCalled();
  });
});

describe('crear y listar', () => {
  it('crea con producto_ids sin duplicados y observacion recortada', async () => {
    const r = await llamar('post', '/conteos', ADMIN, { producto_ids: [3, 1, 3], observacion: '  Mensual ' });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, data: { id: 1, estado: 'BORRADOR', items_total: 2 }, meta: {} });
    expect(conteos.crear).toHaveBeenCalledWith({ producto_ids: [3, 1], observacion: 'Mensual' }, { usuario: { id: 1, contexto: 'usuarios' }, ip: expect.any(String) });
  });

  it.each([
    [{ producto_ids: [] }], [{ producto_ids: ['1'] }], [{ producto_ids: [0] }], [{ observacion: 'x'.repeat(256) }]
  ])('body inválido %j responde 400', async (body) => {
    const r = await llamar('post', '/conteos', ADMIN, body);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(conteos.crear).not.toHaveBeenCalled();
  });

  it('listar valida estado y pagina', async () => {
    expect((await llamar('get', '/conteos?estado=OTRO', ADMIN)).status).toBe(400);
    const r = await llamar('get', '/conteos?estado=BORRADOR&page=2&limit=10', ADMIN);
    expect(r.body.meta).toEqual({ page: 2, limit: 10, total: 0 });
    expect(conteos.listar).toHaveBeenCalledWith({ estado: 'BORRADOR', page: 2, limit: 10 });
  });
});

describe('captura, anulación y aprobación', () => {
  it('captura con null para limpiar una línea', async () => {
    const r = await llamar('patch', '/conteos/4/items', OPERACIONES, { items: [{ item_id: 1, cantidad_contada: 8, motivo: 'Merma' }, { item_id: 2, cantidad_contada: null }] });
    expect(r.status).toBe(200);
    expect(conteos.capturar).toHaveBeenCalledWith(4, [
      { item_id: 1, cantidad_contada: 8, motivo: 'Merma' }, { item_id: 2, cantidad_contada: null, motivo: null }
    ], expect.any(Object));
  });

  it.each([
    [{}], [{ items: [] }], [{ items: [{ item_id: 1, cantidad_contada: -1 }] }], [{ items: [{ item_id: 1, cantidad_contada: 1.5 }] }],
    [{ items: [{ item_id: 1, cantidad_contada: '3' }] }], [{ items: [{ item_id: 1, cantidad_contada: 1 }, { item_id: 1, cantidad_contada: 2 }] }]
  ])('captura inválida %j responde 400', async (body) => {
    expect((await llamar('patch', '/conteos/4/items', ADMIN, body)).status).toBe(400);
    expect(conteos.capturar).not.toHaveBeenCalled();
  });

  it('anular pasa el motivo', async () => {
    const r = await llamar('patch', '/conteos/4/anular', ADMIN, { motivo: 'Error' });
    expect(r.body.data.estado).toBe('ANULADO');
    expect(conteos.anular).toHaveBeenCalledWith(4, 'Error', expect.any(Object));
  });

  it('Admin aprueba; conteo ya aprobado responde 409', async () => {
    expect((await llamar('post', '/conteos/4/aprobar', ADMIN, {})).body.data.conteo.estado).toBe('APROBADO');
    const r = await llamar('post', '/conteos/9/aprobar', ADMIN, {});
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'CONTEO_NO_EDITABLE' } });
  });

  it('id no numérico responde 400', async () => {
    expect((await llamar('get', '/conteos/abc', ADMIN)).status).toBe(400);
  });
});
