/**
 * RF-BOD-02 — Capa HTTP de /api/v1/bodega/solicitudes/:id/cruce, /lista-compra y
 * /ordenes-compra/desde-lista (routes + cruce-controlador) con jsonwebtoken real. El servicio se
 * simula: aquí se verifica cableado, el orden de rutas (/:id/cruce no choca con /:id) y el formato
 * { ok, data, meta } / { ok:false, error } (spec §2.6).
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => (id === 1 ? { nombre: 'Administrador' } : { nombre: 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
// RF-BOD-01/03 comparten el router: se simulan para no cargar modelos/servicios reales.
jest.mock('../../services/bodega/solicitudes', () => ({
  listarProductosSolicitables: jest.fn(async () => []),
  listarCentrosPermitidos: jest.fn(async () => []),
  crear: jest.fn(),
  listar: jest.fn(async (f) => ({ data: [], meta: { page: f.page, limit: f.limit, total: 0 } })),
  listarMias: jest.fn(),
  obtener: jest.fn(async (id) => ({ id: Number(id) })),
  anular: jest.fn()
}));
jest.mock('../../services/bodega/proveedores', () => ({}));
jest.mock('../../services/bodega/ordenesCompra', () => ({}));
jest.mock('../../services/bodega/proveedorProducto', () => ({ asignarProveedor: jest.fn() }));
jest.mock('../../services/bodega/cruceStock', () => ({
  obtenerCruce: jest.fn(),
  listaCompra: jest.fn(),
  generarDesdeLista: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const Usuario = require('../../modelos/sistema_base/Usuario');
const servicioSolicitudes = require('../../services/bodega/solicitudes');
const cruceStock = require('../../services/bodega/cruceStock');
const AppError = require('../../libs/app-error');
const router = require('../../api/v1/bodega/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-02';
const ADMIN = jwt.sign({ id: 1, correo: 'admin@prueba.cl', roleId: 1 }, CLAVE);
const OTRO_ROL = jwt.sign({ id: 2, correo: 'otro@prueba.cl', roleId: 2 }, CLAVE);

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
beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  Usuario.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, correo: 'admin@prueba.cl', roleId: 1, estado: 1 } : { id: 2, correo: 'otro@prueba.cl', roleId: 2, estado: 1 }));
});

describe('GET /solicitudes/:id/cruce', () => {
  it('no choca con GET /solicitudes/:id: usa el controlador de cruce, no el de solicitudes', async () => {
    cruceStock.obtenerCruce.mockResolvedValue({ solicitud_id: 7, estado: 'PARCIAL', pedido: [], descontado: [], falta_comprar: [] });
    const r = await llamar('get', '/solicitudes/7/cruce', ADMIN);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, data: { solicitud_id: 7, estado: 'PARCIAL', pedido: [], descontado: [], falta_comprar: [] }, meta: {} });
    expect(cruceStock.obtenerCruce).toHaveBeenCalledWith(7);
    expect(servicioSolicitudes.obtener).not.toHaveBeenCalled();
  });

  it('GET /solicitudes/:id (sin /cruce) sigue yendo al controlador de solicitudes', async () => {
    const r = await llamar('get', '/solicitudes/7', ADMIN);
    expect(r.status).toBe(200);
    expect(servicioSolicitudes.obtener).toHaveBeenCalledWith(7, expect.anything());
    expect(cruceStock.obtenerCruce).not.toHaveBeenCalled();
  });

  it('propaga SOLICITUD_NO_EXISTE (404) del servicio', async () => {
    cruceStock.obtenerCruce.mockRejectedValue(new AppError('SOLICITUD_NO_EXISTE', 'la solicitud no existe', 404, { id: 99 }));
    const r = await llamar('get', '/solicitudes/99/cruce', ADMIN);
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'SOLICITUD_NO_EXISTE' } });
  });

  it('usuario intranet sin rol admin/operaciones -> 403', async () => {
    const r = await llamar('get', '/solicitudes/7/cruce', OTRO_ROL);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('sin token -> 401', async () => {
    const r = await llamar('get', '/solicitudes/7/cruce');
    expect(r.status).toBe(401);
  });
});

describe('GET /lista-compra', () => {
  it('sin agrupar: pasa agrupar=null y responde { ok, data, meta }', async () => {
    cruceStock.listaCompra.mockResolvedValue([{ producto_id: 1, cantidad_a_comprar: 2 }]);
    const r = await llamar('get', '/lista-compra', ADMIN);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, data: [{ producto_id: 1, cantidad_a_comprar: 2 }], meta: { agrupar: null } });
    expect(cruceStock.listaCompra).toHaveBeenCalledWith({ agrupar: null });
  });

  it('agrupar=proveedor se reenvía igual al servicio', async () => {
    cruceStock.listaCompra.mockResolvedValue([]);
    const r = await llamar('get', '/lista-compra?agrupar=proveedor', ADMIN);
    expect(r.status).toBe(200);
    expect(r.body.meta).toEqual({ agrupar: 'proveedor' });
    expect(cruceStock.listaCompra).toHaveBeenCalledWith({ agrupar: 'proveedor' });
  });

  it('cualquier otro valor de agrupar -> 400 CAMPO_INVALIDO (RF-BOD-02, reviewer)', async () => {
    const r = await llamar('get', '/lista-compra?agrupar=otra-cosa', ADMIN);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
    expect(cruceStock.listaCompra).not.toHaveBeenCalled();
  });

  it('usuario intranet sin rol admin/operaciones -> 403', async () => {
    const r = await llamar('get', '/lista-compra', OTRO_ROL);
    expect(r.status).toBe(403);
  });
});

describe('POST /ordenes-compra/desde-lista', () => {
  it('201 con el reporte del servicio y pasa usuario + ip', async () => {
    cruceStock.generarDesdeLista.mockResolvedValue({ creadas: [{ orden_id: 1 }], omitidas: [], sin_proveedor: [] });
    const r = await llamar('post', '/ordenes-compra/desde-lista', ADMIN);
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, data: { creadas: [{ orden_id: 1 }], omitidas: [], sin_proveedor: [] }, meta: {} });
    expect(cruceStock.generarDesdeLista).toHaveBeenCalledWith(expect.objectContaining({ usuario: expect.objectContaining({ id: 1, contexto: 'usuarios' }) }));
  });

  it('usuario intranet sin rol admin/operaciones -> 403', async () => {
    const r = await llamar('post', '/ordenes-compra/desde-lista', OTRO_ROL);
    expect(r.status).toBe(403);
    expect(cruceStock.generarDesdeLista).not.toHaveBeenCalled();
  });

  it('200 (no 201) si no se creó ningún borrador', async () => {
    cruceStock.generarDesdeLista.mockResolvedValue({ creadas: [], omitidas: [], sin_proveedor: [] });
    const r = await llamar('post', '/ordenes-compra/desde-lista', ADMIN);
    expect(r.status).toBe(200);
    expect(r.body.data.creadas).toEqual([]);
  });
});

describe('/solicitudes/:id/cruce: validación de id', () => {
  it('id no numérico -> 400 SOLICITUD_ID_INVALIDO', async () => {
    const r = await llamar('get', '/solicitudes/abc/cruce', ADMIN);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'SOLICITUD_ID_INVALIDO' } });
  });

  it('id <= 0 -> 400', async () => {
    const r = await llamar('get', '/solicitudes/0/cruce', ADMIN);
    expect(r.status).toBe(400);
  });
});
