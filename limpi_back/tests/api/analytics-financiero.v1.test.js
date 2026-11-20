/**
 * RF-BI-01 — Capa HTTP de /api/v1/analytics/financiero (resumen, proyeccion, validacion).
 * El gate de roles ya se cubre en analytics.v1.test.js; aqui solo Admin.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../services/caja/saldo', () => ({
  ...jest.requireActual('../../services/caja/saldo'),
  calcularSaldo: jest.fn()
}));
jest.mock('../../services/facturas/pendientes', () => ({ resumenPendientes: jest.fn() }));
jest.mock('../../modelos/sistema_base/Configuracion', () => ({ findOne: jest.fn() }));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Usuario = require('../../modelos/sistema_base/Usuario');
const db = require('../../database/database');
const fecha = require('../../libs/fecha');
const { calcularSaldo } = require('../../services/caja/saldo');
const { resumenPendientes } = require('../../services/facturas/pendientes');
const Configuracion = require('../../modelos/sistema_base/Configuracion');
const { autenticar } = require('../../middleware/auth');
const routerAnalytics = require('../../api/v1/analytics/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKEN_ADMIN = 'token-admin';

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
  jest.spyOn(fecha, 'hoySantiago').mockReturnValue('2026-11-20');
  jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Usuario.findById.mockImplementation((id) => Promise.resolve({ id: id, correo: 'a@a.com', roleId: id, estado: 1 }));
  Role.findById.mockImplementation((id) => Promise.resolve(id === 1 ? { id: 1, nombre: 'Administrador' } : null));
  Configuracion.findOne.mockResolvedValue({ valor: '100000' });
  resumenPendientes.mockResolvedValue({
    por_cobrar: { cantidad: 1, monto_total: 50000 },
    por_pagar: { cantidad: 2, monto_total: 70000 }
  });
  calcularSaldo.mockResolvedValue({
    periodo: '2026-03',
    cajaId: 7,
    estado: 0,
    saldo_inicial: 100000,
    ingresos: 500000,
    egresos: { generales: null, centros: null, liquidaciones_historicas: null, total: 200000 },
    saldo_final: 400000,
    provisional: false,
    pendientes: { cantidad: 1, monto: 30000 }
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function get(ruta) {
  return request(buildApp()).get('/api/v1/analytics/financiero' + ruta).set('x-access-token', TOKEN_ADMIN);
}

function esperarError(res, estado, code) {
  expect(res.status).toBe(estado);
  expect(res.body.ok).toBe(false);
  expect(res.body.error).toEqual(expect.objectContaining({ code: code }));
}

describe('GET /financiero/resumen', () => {
  it('Admin con periodo valido -> 200 {ok:true,data} con al menos 5 KPIs', async () => {
    const res = await get('/resumen?periodo=2026-03');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta).toEqual({ periodo: '2026-03' });
    const kpis = ['utilidad_real', 'saldo_acumulado', 'proyeccion', 'alerta_utilidad', 'liquidaciones_pendientes', 'por_cobrar', 'por_pagar'];
    kpis.forEach(function (k) { expect(res.body.data).toHaveProperty(k); });
    expect(res.body.data.utilidad_real.utilidad).toBe(300000);
    expect(res.body.data.por_pagar.monto).toBe(70000);
    expect(res.body.data.por_cobrar.monto).toBe(50000);
  });

  it('sin periodo usa el mes actual de Santiago', async () => {
    const res = await get('/resumen');
    expect(res.status).toBe(200);
    expect(res.body.meta.periodo).toBe('2026-11');
    expect(calcularSaldo).toHaveBeenCalledWith('2026-11');
  });

  it('periodo invalido -> 400 PERIODO_INVALIDO sin consultar caja', async () => {
    esperarError(await get('/resumen?periodo=2026-13'), 400, 'PERIODO_INVALIDO');
    expect(calcularSaldo).not.toHaveBeenCalled();
  });
});

describe('GET /financiero/proyeccion', () => {
  it('con menos de 3 cajas cerradas -> insuficiente, sin numeros', async () => {
    db.sequelize.query.mockResolvedValue([
      { periodo: '2026-10', total_ingreso: '1000', total_egreso: '0' },
      { periodo: '2026-09', total_ingreso: '1000', total_egreso: '0' }
    ]);
    const res = await get('/proyeccion');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.insuficiente).toBe(true);
    expect(res.body.data.promedio_movil).toBeNull();
    expect(res.body.data.regresion).toBeNull();
  });
});

describe('GET /financiero/tendencia (validacion de rango)', () => {
  it('desde posterior a hasta -> 400 RANGO_INVALIDO', async () => {
    esperarError(await get('/tendencia?desde=2026-05&hasta=2026-03'), 400, 'RANGO_INVALIDO');
  });

  it('hasta con formato invalido -> 400 PERIODO_INVALIDO', async () => {
    esperarError(await get('/tendencia?desde=2026-01&hasta=03-2026'), 400, 'PERIODO_INVALIDO');
  });
});

function getRent(ruta) {
  return request(buildApp()).get('/api/v1/analytics/rentabilidad' + ruta).set('x-access-token', TOKEN_ADMIN);
}

describe('GET /rentabilidad (RF-BI-02)', () => {
  it('sin parametros -> 200 con rango por defecto de 3 meses y fila de gastos generales', async () => {
    db.sequelize.query.mockResolvedValue([{ monto: 0 }]);
    const res = await getRent('');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta).toEqual(expect.objectContaining({ desde: '2026-09', hasta: '2026-11' }));
    expect(res.body.data[res.body.data.length - 1].tipo).toBe('GASTOS_GENERALES');
  });

  it('formato invalido -> 400 PERIODO_INVALIDO', async () => {
    esperarError(await getRent('?desde=2026-1'), 400, 'PERIODO_INVALIDO');
  });

  ['abc', '0', '-1', '1.5'].forEach((id) => {
    it('detalle con centroCostoId ' + id + ' -> 400 CAMPO_INVALIDO', async () => {
      esperarError(await getRent('/' + id + '/detalle'), 400, 'CAMPO_INVALIDO');
    });
  });

  it('detalle de centro inexistente -> 404 CENTRO_NO_EXISTE', async () => {
    esperarError(await getRent('/99/detalle'), 404, 'CENTRO_NO_EXISTE');
  });
});

describe('D-153: revalidacion del usuario en /analytics', () => {
  it('admin desactivado (estado 0) con JWT vigente -> 401', async () => {
    Usuario.findById.mockResolvedValue({ id: 1, correo: 'a@a.com', roleId: 1, estado: 0 });
    esperarError(await get('/proyeccion'), 401, 'TOKEN_INVALID');
  });

  it('roleId distinto al del token -> 401', async () => {
    Usuario.findById.mockResolvedValue({ id: 1, correo: 'a@a.com', roleId: 2, estado: 1 });
    esperarError(await get('/proyeccion'), 401, 'TOKEN_INVALID');
  });
});
