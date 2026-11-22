/**
 * QA-01 T8 — Un supervisor (token de acceso laboral) no ve costos, stock global, kardex, conteos ni solicitudes
 * de otros por HTTP: toda ruta de bodega que expone eso responde 403 FORBIDDEN antes de llegar al servicio.
 * Que no vea solicitudes ajenas (404) ni asignado/faltante está en tests/services/bodega/solicitudes.test.js.
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async () => ({ nombre: 'Administrador' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: 1, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn(async (id) => ({ id: id, nombre: 'Sup', estado: 1 })) }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn(async () => ({ id: 70 })) }));
jest.mock('../../services/bodega/solicitudes', () => ({}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../services/bodega/cruceStock', () => ({}));
jest.mock('../../services/bodega/conteos', () => ({}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-qa-01';
const SUPERVISOR = jwt.sign({ id: 7, tipo_acceso: 1 }, CLAVE);

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/bodega', router);
  a.use(noEncontrado);
  a.use(manejadorErrores);
  return a;
}

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());
beforeEach(() => { process.env.SECRET_KEY = CLAVE; });

// [método, ruta, qué expondría]
const SENSIBLES = [
  ['get', '/productos/5/kardex', 'costos y saldos valorizados'],
  ['get', '/movimientos', 'kardex global'],
  ['get', '/solicitudes', 'solicitudes de otros'],
  ['get', '/solicitudes/1/cruce', 'stock asignado'],
  ['get', '/solicitudes/1/formato-entrega', 'entrega'],
  ['get', '/dashboard', 'stock global'],
  ['get', '/lista-compra', 'faltantes globales'],
  ['get', '/productos', 'stock y costo por producto'],
  ['get', '/stock-rapido', 'stock global'],
  ['get', '/ordenes-compra', 'costos de compra'],
  ['get', '/ordenes-compra/1', 'costos de compra'],
  ['get', '/ordenes-compra/1/recepcion', 'costos reales recibidos'],
  ['get', '/proveedores', 'proveedores'],
  ['get', '/conteos', 'conteos'],
  ['get', '/conteos/1', 'stock teórico'],
  ['post', '/conteos', 'crear conteo'],
  ['post', '/conteos/1/aprobar', 'ajustes de stock'],
  ['post', '/ordenes-compra/1/recepcion', 'entradas de stock'],
  ['post', '/solicitudes/1/entregar', 'salidas de stock']
];

describe('QA-01 T8: supervisor -> 403 en rutas con costos, stock global o datos de otros', () => {
  it.each(SENSIBLES)('%s %s (%s)', async (metodo, ruta) => {
    const r = await request(app())[metodo]('/api/v1/bodega' + ruta).set('x-access-token', SUPERVISOR).send({});
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });
});
