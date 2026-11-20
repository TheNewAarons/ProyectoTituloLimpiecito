/**
 * RF-BI-01a — Tests del gate de roles de /api/v1/analytics (D-145, deny-by-default), montado como en
 * index.js: autenticar a nivel de path + router con requerirRol por sub-recurso. Sin endpoints aún
 * (D-146): el rol autorizado recibe 404 JSON y el no autorizado 403. Patrón: tests/api/pev.v1.test.js.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const { autenticar } = require('../../middleware/auth');
const routerAnalytics = require('../../api/v1/analytics/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKENS = { 'token-admin': 1, 'token-rrhh': 2, 'token-ops': 3 };
const ROLES = { 1: 'Administrador', 2: 'RRHH', 3: 'Operaciones' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/analytics', autenticar, routerAnalytics);
  app.use('/api/v1', noEncontrado);
  app.use(manejadorErrores);
  return app;
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

function get(ruta, token) {
  const req = request(buildApp()).get('/api/v1/analytics' + ruta);
  return token ? req.set('x-access-token', token) : req;
}

function esperarError(res, estado, code) {
  expect(res.status).toBe(estado);
  expect(res.body.ok).toBe(false);
  expect(res.body.error).toEqual(expect.objectContaining({ code: code }));
}

describe('autenticación', () => {
  it('sin token responde 401 TOKEN_REQUERIDO', async () => {
    const res = await get('/bodega/top-productos');
    esperarError(res, 401, 'TOKEN_REQUERIDO');
  });

  it('token inválido responde 401', async () => {
    const res = await get('/financiero/resumen', 'token-falso');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe('RRHH (rol no permitido) → 403 en todo /analytics', () => {
  ['/bodega/x', '/productividad/x', '/financiero/resumen', '/rentabilidad', '/otra'].forEach((ruta) => {
    it('GET ' + ruta + ' → 403 FORBIDDEN', async () => {
      esperarError(await get(ruta, 'token-rrhh'), 403, 'FORBIDDEN');
    });
  });
});

describe('Operaciones', () => {
  ['/financiero/resumen', '/rentabilidad', '/demanda/x', '/otra'].forEach((ruta) => {
    it('GET ' + ruta + ' → 403 FORBIDDEN (solo Admin)', async () => {
      esperarError(await get(ruta, 'token-ops'), 403, 'FORBIDDEN');
    });
  });

  ['/bodega/top-productos', '/bodega', '/productividad/x'].forEach((ruta) => {
    it('GET ' + ruta + ' pasa el gate → 404 NOT_FOUND', async () => {
      esperarError(await get(ruta, 'token-ops'), 404, 'NOT_FOUND');
    });
  });
});

describe('Administrador pasa el gate en todo → 404 JSON', () => {
  ['/bodega/x', '/productividad/x', '/financiero/resumen', '/rentabilidad', '/demanda/x', '/otra'].forEach((ruta) => {
    it('GET ' + ruta + ' → 404 NOT_FOUND', async () => {
      esperarError(await get(ruta, 'token-admin'), 404, 'NOT_FOUND');
    });
  });

  it('POST de Admin pasa el gate → 404 (sin endpoints de escritura)', async () => {
    const res = await request(buildApp()).post('/api/v1/analytics/financiero/resumen').set('x-access-token', 'token-admin').send({});
    esperarError(res, 404, 'NOT_FOUND');
  });
});

describe('bordes del gate', () => {
  it('POST de Operaciones a /financiero → 403', async () => {
    const res = await request(buildApp()).post('/api/v1/analytics/financiero').set('x-access-token', 'token-ops').send({});
    esperarError(res, 403, 'FORBIDDEN');
  });

  ['/Financiero/', '//financiero'].forEach((ruta) => {
    it('Operaciones GET ' + ruta + ' → 403 (cae en el gate Admin)', async () => {
      esperarError(await get(ruta, 'token-ops'), 403, 'FORBIDDEN');
    });
  });

  it('Operaciones GET /BODEGA/x → 404 (rutas sin distinción de mayúsculas)', async () => {
    esperarError(await get('/BODEGA/x', 'token-ops'), 404, 'NOT_FOUND');
  });

  it('token sin roleId (supervisor/cliente) → 403', async () => {
    jwt.verify.mockImplementation(() => ({ id: 9, correo: 'c@c.com' }));
    esperarError(await get('/bodega/x', 'token-x'), 403, 'FORBIDDEN');
  });
});
