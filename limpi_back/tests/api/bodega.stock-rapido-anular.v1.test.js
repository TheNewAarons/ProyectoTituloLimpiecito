/**
 * RNF-ARQ-01 (cierre D-ARQ-01-1) — Capa HTTP de PATCH /api/v1/bodega/stock-rapido/:id/anular con jsonwebtoken real.
 * El servicio se simula (su lógica: tests/services/bodega/stock-rapido-anular.test.js).
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/stock-rapido-anular', () => {
  const AppError = require('../../libs/app-error');
  return {
    anular: jest.fn(async (id, motivo) => {
      if (id === 9) throw new AppError('YA_ANULADA', 'la entrada de stock rápido ya está anulada', 409, { id: id });
      return { id: id, motivo_anulacion: motivo, movimiento_id: 30, producto: { id: 1, stock: 6 } };
    })
  };
});
// El router también carga los demás controladores de bodega: sus servicios se simulan (como en bodega.conteos.v1.test.js).
jest.mock('../../services/bodega/solicitudes', () => ({}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../services/bodega/cruceStock', () => ({}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const servicio = require('../../services/bodega/stock-rapido-anular');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-arq-01-anular';
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
const anular = (id, token, body) => {
  let r = request(app()).patch('/api/v1/bodega/stock-rapido/' + id + '/anular');
  if (token) r = r.set('x-access-token', token);
  return r.send(body || {});
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());
beforeEach(() => { process.env.SECRET_KEY = CLAVE; jest.clearAllMocks(); });

describe('PATCH /stock-rapido/:id/anular', () => {
  it('sin token 401 y con otro rol 403, sin llamar al servicio', async () => {
    expect((await anular(1)).status).toBe(401);
    expect((await anular(1, OTRO_ROL, { motivo: 'x' })).status).toBe(403);
    expect(servicio.anular).not.toHaveBeenCalled();
  });

  it.each([['Administrador', ADMIN, 1], ['Operaciones', OPERACIONES, 2]])('%s anula: 200 { ok, data } con el usuario del token', async (_rol, token, uid) => {
    const r = await anular(4, token, { motivo: 'Ingresado por error' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, data: { id: 4, motivo_anulacion: 'Ingresado por error', movimiento_id: 30, producto: { id: 1, stock: 6 } }, meta: {} });
    expect(servicio.anular).toHaveBeenCalledWith(4, 'Ingresado por error', expect.objectContaining({ usuario: { id: uid, contexto: 'usuarios' } }));
  });

  it.each(['abc', '0', '1.5'])('id inválido (%s) responde 400 sin llamar al servicio', async (id) => {
    const r = await anular(id, ADMIN, { motivo: 'Ingresado por error' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('CAMPO_INVALIDO');
    expect(servicio.anular).not.toHaveBeenCalled();
  });

  it('el error del servicio llega como { ok:false, error } con su estado HTTP', async () => {
    const r = await anular(9, ADMIN, { motivo: 'Ingresado por error' });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'YA_ANULADA' } });
  });
});
