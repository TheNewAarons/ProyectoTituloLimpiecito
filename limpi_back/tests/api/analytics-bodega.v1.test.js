/**
 * RF-BI-03 — GET /api/v1/analytics/bodega/*: gate (Admin y Operaciones), validación de parámetros y formato
 * { ok, data, meta }. sequelize.query se espía: aquí importa la forma de la consulta, no la BD.
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

function app() {
  const a = express();
  a.use('/api/v1/analytics', autenticar, routerAnalytics);
  a.use('/api/v1', noEncontrado);
  a.use(manejadorErrores);
  return a;
}
const get = (ruta, token) => request(app()).get('/api/v1/analytics/bodega' + ruta).set('x-access-token', token || 'token-ops');

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

describe('gate', () => {
  it('RRHH → 403 y no consulta la BD', async () => {
    expect((await get('/stock-critico', 'token-rrhh')).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('supervisor / cliente (token sin roleId) → 403', async () => {
    jwt.verify.mockImplementation(() => ({ id: 9, correo: 's@s.com' }));
    expect((await get('/top-productos', 'token-x')).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('Operaciones y Admin → 200 con { ok, data, meta } en los 4 endpoints', async () => {
    for (const token of ['token-ops', 'token-admin']) {
      for (const ruta of ['/top-productos', '/consumo', '/frecuencia-compra', '/stock-critico']) {
        const res = await get(ruta, token);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining({ ok: true, data: expect.any(Array), meta: expect.any(Object) }));
      }
    }
  });
});

describe('validación', () => {
  [
    ['/top-productos?limite=0', 'CAMPO_INVALIDO'], ['/top-productos?limite=51', 'CAMPO_INVALIDO'], ['/top-productos?limite=1e1', 'CAMPO_INVALIDO'],
    ['/consumo?agrupar=cliente', 'CAMPO_INVALIDO'], ['/consumo?producto_id=-1', 'CAMPO_INVALIDO'],
    ['/consumo?desde=2026-1', 'PERIODO_INVALIDO'], ['/frecuencia-compra?desde=2026-11&hasta=2026-01', 'RANGO_INVALIDO'],
    ['/top-productos?desde=2020-01&hasta=2026-11', 'RANGO_INVALIDO'], ['/consumo?hasta=abc', 'PERIODO_INVALIDO']
  ].forEach(([ruta, code]) => {
    it('GET ' + ruta + ' → 400 ' + code + ' sin consultar la BD', async () => {
      const res = await get(ruta);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(code);
      expect(query).not.toHaveBeenCalled();
    });
  });
});

describe('consultas', () => {
  it('consumo: excluye anuladas, usa parámetros (no interpola) y la ventana del rango', async () => {
    const res = await get('/consumo?agrupar=mes&desde=2026-10&hasta=2026-11');
    expect(res.body.data.map((f) => f.periodo)).toEqual(['2026-10', '2026-11']);
    expect(res.body.meta).toEqual({ desde: '2026-10', hasta: '2026-11', agrupar: 'mes', producto_id: null, total: 0 });
    const [sql, opts] = query.mock.calls[0];
    expect(sql).toMatch(/s\.estado <> :anulada/);
    expect(opts.replacements).toMatchObject({ anulada: 'ANULADA' });
    expect(opts.replacements.ini.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  it('frecuencia-compra: solo órdenes enviadas o recibidas (sin borradores ni anuladas)', async () => {
    await get('/frecuencia-compra');
    expect(query.mock.calls[0][1].replacements.estados).toEqual(['ENVIADA', 'RECIBIDA_PARCIAL', 'RECIBIDA']);
  });

  it('RF-BOD-04 merma: solo recepciones confirmadas y meta con totales y serie mensual', async () => {
    const res = await get('/merma?desde=2026-10&hasta=2026-11');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1].replacements.confirmada).toBe('CONFIRMADA');
    expect(res.body.meta).toMatchObject({ desde: '2026-10', hasta: '2026-11', rechazado: 0, porcentaje_merma: 0, por_mes: [{ periodo: '2026-10', recibido: 0, rechazado: 0 }, { periodo: '2026-11', recibido: 0, rechazado: 0 }] });
    expect((await get('/merma', 'token-rrhh')).status).toBe(403);
  });

  it('stock-critico: misma regla que el dashboard de bodega y faltante calculado', async () => {
    query.mockResolvedValueOnce([{ id: 4, nombre: 'Guantes', stock: 1, stock_minimo: 10 }]);
    const res = await get('/stock-critico');
    expect(query.mock.calls[0][0]).toContain(require('../../services/bodega/dashboard').SQL_BAJO_MINIMO);
    expect(res.body).toEqual({ ok: true, data: [{ producto_id: 4, producto: 'Guantes', stock: 1, stock_minimo: 10, faltante: 9 }], meta: { total: 1 } });
  });
});
