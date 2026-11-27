/**
 * RF-BI-05 (revisión) — /api/v1/analytics/demanda y /demanda/dia: solo Admin (gate D-153 con revalidación) y 400 por fecha inválida.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Usuario = require('../../modelos/sistema_base/Usuario');
const db = require('../../database/database');
const { autenticar } = require('../../middleware/auth');
const routerAnalytics = require('../../api/v1/analytics/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKENS = { 'token-admin': 1, 'token-ops': 3 };
const ROLES = { 1: 'Administrador', 3: 'Operaciones' };

function app() {
  const a = express();
  a.use('/api/v1/analytics', autenticar, routerAnalytics);
  a.use('/api/v1', noEncontrado);
  a.use(manejadorErrores);
  return a;
}

let query;
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
  Usuario.findById.mockImplementation((id) => Promise.resolve({ id: id, correo: 'u@u.com', roleId: id, estado: 1 }));
  query = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);
});
afterAll(() => query.mockRestore());

it.each(['/demanda', '/demanda/dia?fecha=2026-12-01'])('%s: sin sesión 401 y Operaciones 403 (datos con montos de clientes)', async (ruta) => {
  expect((await request(app()).get('/api/v1/analytics' + ruta)).status).toBe(401);
  expect((await request(app()).get('/api/v1/analytics' + ruta).set('x-access-token', 'token-ops')).status).toBe(403);
});

it('Admin recibe {ok,data,meta} de la agenda del día', async () => {
  const r = await request(app()).get('/api/v1/analytics/demanda/dia?fecha=2026-12-01').set('x-access-token', 'token-admin');
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ ok: true, data: { fecha: '2026-12-01', dia: 'Martes', reservas: [] }, meta: { fecha: '2026-12-01' } });
});

it.each(['2026-13-45', '2026-02-30', '01-12-2026'])('fecha inválida %s responde 400 (no 500)', async (f) => {
  const r = await request(app()).get('/api/v1/analytics/demanda/dia?fecha=' + f).set('x-access-token', 'token-admin');
  expect(r.status).toBe(400);
  expect(r.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
});
