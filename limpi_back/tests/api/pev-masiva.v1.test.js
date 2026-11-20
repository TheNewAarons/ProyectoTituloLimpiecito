/**
 * RF-PEV-01 — Gate de /api/v1/pev/asignaciones-masivas montado como en index.js (autenticar + requerirRol Admin).
 * El servicio se mockea: aquí solo importa quién llega al controlador. Patrón: tests/api/analytics.v1.test.js.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../services/pev/asignacion-masiva', () => ({
  TOPE: 500,
  opciones: jest.fn(async () => ({ clientes: [] })),
  previsualizar: jest.fn(async () => ({ resumen: {} })),
  ejecutar: jest.fn(async () => ({ asignaciones_creadas: [] }))
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const servicio = require('../../services/pev/asignacion-masiva');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKENS = { 'token-admin': 1, 'token-ops': 3 };
const ROLES = { 1: 'Administrador', 3: 'Operaciones' };

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/pev/asignaciones-masivas', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), require('../../api/v1/pev/masiva/routes'));
  a.use('/api/v1', noEncontrado);
  a.use(manejadorErrores);
  return a;
}

beforeEach(() => {
  jest.clearAllMocks();
  jwt.verify.mockImplementation((token) => {
    const roleId = TOKENS[token];
    if (roleId) return { id: roleId, nombre: ROLES[roleId], correo: 'u@u.com', roleId: roleId };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Role.findById.mockImplementation((id) => Promise.resolve(ROLES[id] ? { id: id, nombre: ROLES[id] } : null));
});

const URL = '/api/v1/pev/asignaciones-masivas';

it('sin token: 401 y no llega al servicio', async () => {
  const res = await request(app()).post(URL).send({});
  expect(res.status).toBe(401);
  expect(servicio.ejecutar).not.toHaveBeenCalled();
});

it('rol no Admin: 403 en opciones, vista previa y ejecutar', async () => {
  for (const r of [request(app()).get(URL + '/opciones'), request(app()).post(URL + '/vista-previa').send({}), request(app()).post(URL).send({})]) {
    const res = await r.set('x-access-token', 'token-ops');
    expect(res.status).toBe(403);
  }
  expect(servicio.opciones).not.toHaveBeenCalled();
  expect(servicio.previsualizar).not.toHaveBeenCalled();
  expect(servicio.ejecutar).not.toHaveBeenCalled();
});

it('Admin: ejecutar responde 201 con las funciones reales de services/pev inyectadas', async () => {
  const res = await request(app()).post(URL).set('x-access-token', 'token-admin').send({ cliente_id: 1 });
  expect(res.status).toBe(201);
  expect(res.body.ok).toBe(true);
  const deps = servicio.ejecutar.mock.calls[0][2];
  expect(typeof deps.crearActividadEnTx).toBe('function');
  expect(typeof deps.crearAsignacionEnTx).toBe('function');
});
