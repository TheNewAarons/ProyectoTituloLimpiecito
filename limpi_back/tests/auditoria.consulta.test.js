/**
 * RNF-SEC-02 — Consulta "quién cambió qué y cuándo": por entidad+entidad_id se recupera el rastro
 * con usuario_id/contexto_usuario/accion/created_at y valores_antes/despues parseados, ordenado
 * created_at DESC. Caja (egresos/cajas) y bodega (solicitudes_bodega).
 */
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../modelos/sistema_base/Auditoria', () => ({ findAndCountAll: jest.fn(), findById: jest.fn(), create: jest.fn() }));
jest.mock('../modelos/sistema_bodega/Movimiento_bodega', () => ({}));
jest.mock('../modelos/sistema_base/Producto', () => ({}));

const express = require('express');
const request = require('supertest');

const jwt = require('jsonwebtoken');
const Role = require('../modelos/sistema_base/Role');
const Auditoria = require('../modelos/sistema_base/Auditoria');
const { autenticar, requerirRol } = require('../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../services/constantes');
const router = require('../api/v1/auditoria/routes');
const { manejadorErrores, noEncontrado } = require('../middleware/errores');

const TOKEN_ADMIN = 'token-admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auditoria', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), router);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

beforeEach(() => {
  process.env.SECRET_KEY = 'clave-consulta';
  jest.clearAllMocks();
  jwt.verify.mockReturnValue({ id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 });
  Role.findById.mockResolvedValue({ id: 1, nombre: 'Administrador' });
});

const get = (app, q) => request(app).get('/api/v1/auditoria' + q).set('x-access-token', TOKEN_ADMIN);

describe('consulta de auditoría: quién cambió qué y cuándo', () => {
  it('caja (egresos): por entidad+entidad_id devuelve el rastro parseado y orden created_at DESC', async () => {
    Auditoria.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        {
          id: 2, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'egresos', entidad_id: '5',
          accion: 'REVERSION_PAGO', valores_antes: '{"estado":"PAGADA"}', valores_despues: '{"estado":"PENDIENTE"}',
          motivo: 'pago por error', ip: '127.0.0.1', created_at: '2026-03-11T00:00:00.000Z'
        },
        {
          id: 1, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'egresos', entidad_id: '5',
          accion: 'PAGO', valores_antes: '{"estado":"PENDIENTE"}', valores_despues: '{"estado":"PAGADA"}',
          motivo: null, ip: '127.0.0.1', created_at: '2026-03-10T00:00:00.000Z'
        }
      ]
    });

    const res = await get(buildApp(), '/?entidad=egresos&entidad_id=5');

    expect(res.status).toBe(200);
    expect(Auditoria.findAndCountAll.mock.calls[0][0].order).toEqual([['created_at', 'DESC'], ['id', 'DESC']]);
    expect(Auditoria.findAndCountAll.mock.calls[0][0].where).toMatchObject({ entidad: 'egresos', entidad_id: '5' });
    expect(res.body.data[0]).toMatchObject({
      id: 2, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'egresos', entidad_id: '5', accion: 'REVERSION_PAGO'
    });
    expect(res.body.data[0].valores_antes).toEqual({ estado: 'PAGADA' });
    expect(res.body.data[0].valores_despues).toEqual({ estado: 'PENDIENTE' });
  });

  it('bodega (solicitudes_bodega): la entrega guarda lineas parseadas en valores_despues', async () => {
    Auditoria.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 3, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'solicitudes_bodega', entidad_id: '9',
          accion: 'ENTREGA', valores_antes: '{"estado":"LISTA_ENTREGA"}',
          valores_despues: '{"estado":"ENTREGADA","total":200,"lineas":[{"producto_id":1,"origen":"COSTO"}]}',
          motivo: null, ip: null, created_at: '2026-03-12T00:00:00.000Z'
        }
      ]
    });

    const res = await get(buildApp(), '/?entidad=solicitudes_bodega&entidad_id=9');

    expect(res.status).toBe(200);
    expect(res.body.data[0].valores_despues).toEqual({ estado: 'ENTREGADA', total: 200, lineas: [{ producto_id: 1, origen: 'COSTO' }] });
    expect(res.body.data[0].accion).toBe('ENTREGA');
  });
});
