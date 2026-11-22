/**
 * RF-BI-04 — GET /api/v1/analytics/productividad/*: gate (Admin y Operaciones), validación y formato { ok, data, meta }.
 * sequelize.query se espía: importa la forma de la consulta (parametrizada), no la BD.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const db = require('../../database/database');
const { autenticar } = require('../../middleware/auth');
const routerAnalytics = require('../../api/v1/analytics/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKENS = { 'token-admin': 1, 'token-rrhh': 2, 'token-ops': 3 };
const ROLES = { 1: 'Administrador', 2: 'RRHH', 3: 'Operaciones' };
const RUTAS = ['/trabajadores', '/supervisores', '/sectores'];

function app() {
  const a = express();
  a.use('/api/v1/analytics', autenticar, routerAnalytics);
  a.use('/api/v1', noEncontrado);
  a.use(manejadorErrores);
  return a;
}
const get = (ruta, token) => request(app()).get('/api/v1/analytics/productividad' + ruta).set('x-access-token', token || 'token-ops');

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
  query = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);
});
afterAll(() => query.mockRestore());

it('RRHH → 403 sin consultar la BD; Operaciones y Admin → 200 { ok, data, meta } en los 3 endpoints', async () => {
  for (const r of RUTAS) expect((await get(r, 'token-rrhh')).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
  for (const token of ['token-ops', 'token-admin']) {
    for (const r of RUTAS) {
      const res = await get(r + '?hasta=2026-11', token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ ok: true, data: [], meta: expect.objectContaining({ desde: '2026-09', hasta: '2026-11' }) }));
    }
  }
});

[['/trabajadores?hasta=2026-13', 'PERIODO_INVALIDO'], ['/sectores?desde=2026-11&hasta=2026-01', 'RANGO_INVALIDO'],
  ['/supervisores?supervisor=abc', 'CAMPO_INVALIDO'], ['/trabajadores?cliente_id=0', 'CAMPO_INVALIDO']].forEach(([ruta, code]) => {
  it('GET ' + ruta + ' → 400 ' + code + ' sin consultar la BD', async () => {
    const res = await get(ruta);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(query).not.toHaveBeenCalled();
  });
});

it('consultas parametrizadas con la ventana UTC del rango (±1 día)', async () => {
  await get('/sectores?desde=2026-10&hasta=2026-11');
  const pev = query.mock.calls.find((c) => /linea_lista_pev_trabajadores/.test(c[0]));
  expect(pev[0]).toMatch(/lp\.fecha_chequeo >= :ini AND lp\.fecha_chequeo < :fin/);
  expect(pev[1].replacements.ini.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  expect(pev[1].replacements.fin.toISOString()).toBe('2026-12-02T00:00:00.000Z');
});
