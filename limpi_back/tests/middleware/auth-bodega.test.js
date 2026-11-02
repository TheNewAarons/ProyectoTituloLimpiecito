/**
 * RF-BOD-01 — middleware/auth-bodega.js con jsonwebtoken REAL (firma, expiración y algoritmo se prueban de
 * verdad). Solo se simulan los modelos. También documenta el comportamiento de middleware/auth.autenticar
 * (RF-CAJA-02) frente a tokens de otros contextos, sin modificarlo.
 */
jest.mock('../../database/database', () => ({ sequelize: {} }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const Role = require('../../modelos/sistema_base/Role');
const Usuario = require('../../modelos/sistema_base/Usuario');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const AccesoLaboral = require('../../modelos/sistema_intranet/acceso_laboral');
const { autenticarBodega, permitir } = require('../../middleware/auth-bodega');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-bod-01';
const firmar = (payload, opciones, clave) => jwt.sign(payload, clave || CLAVE, Object.assign({ expiresIn: '1h' }, opciones || {}));

const ADMIN = { id: 1, nombre: 'Admin', correo: 'admin@prueba.cl', roleId: 1, password: '$2a$10$hash' };
const SUPERVISOR = { id: 7, nombre: 'Sup', apellido: 'Prueba', rut: '1-9', tipo_acceso: 1 };
const CLIENTE = { id: 1, nombre: 'Cliente SA', correo: 'cliente@prueba.cl', clienteId: 3 }; // acceso_clientes: id choca con usuarios.id = 1

function app() {
  const a = express();
  const responder = (req, res) => res.json({ ok: true, data: { id: req.usuario.id, contexto: req.usuario.contexto } });
  a.get('/admin', autenticarBodega, permitir({ roles: ['Administrador'] }), responder);
  a.get('/mixta', autenticarBodega, permitir({ roles: ['Administrador'], supervisor: true }), responder);
  a.get('/legacy-autenticar', autenticar, (req, res) => res.json({ ok: true, data: { rol: req.usuario.rol_nombre } }));
  a.get('/legacy-admin', autenticar, requerirRol('Administrador'), responder);
  a.use(manejadorErrores);
  return a;
}

const get = (ruta, token) => {
  const r = request(app()).get(ruta);
  return token === undefined ? r : r.set('x-access-token', token);
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  Role.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, nombre: 'Administrador' } : null));
  Usuario.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, correo: ADMIN.correo, roleId: 1, estado: 1 } : null));
  Trabajadore.findById.mockImplementation(async (id) => (id === 7 ? { id: 7, nombre: 'Sup', apellido: 'Prueba', estado: 1 } : null));
  // Acceso laboral activo y de supervisor solo para el trabajador 7
  AccesoLaboral.findOne.mockImplementation(async (o) => (o.where.trabajadoreId === 7 && o.where.estado === 1 && o.where.tipo === 1 ? { id: 70 } : null));
});

describe('autenticarBodega: token', () => {
  it('sin token -> 401 TOKEN_REQUERIDO', async () => {
    const r = await get('/mixta');
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
  });

  it('token mal formado -> 401 TOKEN_INVALID', async () => {
    const r = await get('/mixta', 'esto.no-es.un-jwt');
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_INVALID');
  });

  it('firmado con otra clave -> 401 TOKEN_INVALID', async () => {
    const r = await get('/mixta', firmar(SUPERVISOR, {}, 'otra-clave'));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_INVALID');
  });

  it('expirado -> 401 TOKEN_EXPIRED', async () => {
    const r = await get('/mixta', firmar(SUPERVISOR, { expiresIn: -10 }));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('solo acepta HS256 (HS512 con la misma clave -> 401)', async () => {
    const r = await get('/mixta', firmar(SUPERVISOR, { algorithm: 'HS512' }));
    expect(r.status).toBe(401);
  });

  it('alg none (sin firma) -> 401', async () => {
    const sinFirma = jwt.sign(SUPERVISOR, null, { algorithm: 'none' });
    const r = await get('/mixta', sinFirma);
    expect(r.status).toBe(401);
  });
});

describe('autenticarBodega: supervisor', () => {
  it('supervisor activo pasa con contexto acceso_trabajadores y su id de trabajadores', async () => {
    const r = await get('/mixta', firmar(SUPERVISOR));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ id: 7, contexto: 'acceso_trabajadores' });
  });

  it('tipo_acceso distinto de 1 -> 403', async () => {
    const r = await get('/mixta', firmar(Object.assign({}, SUPERVISOR, { tipo_acceso: 0 })));
    expect(r.status).toBe(403);
    expect(Trabajadore.findById).not.toHaveBeenCalled();
  });

  it('trabajador inactivo e inexistente -> mismo 401 genérico', async () => {
    Trabajadore.findById.mockImplementation(async (id) => (id === 7 ? { id: 7, estado: 0 } : null));
    const inactivo = await get('/mixta', firmar(SUPERVISOR));
    const inexistente = await get('/mixta', firmar(Object.assign({}, SUPERVISOR, { id: 999 })));
    expect(inactivo.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(inactivo.body.error).toEqual(inexistente.body.error);
    expect(inactivo.body.error.message).toBe('credenciales no validas');
  });

  it('acceso laboral bloqueado o ya no supervisor (token aún vigente) -> mismo 401 genérico', async () => {
    AccesoLaboral.findOne.mockResolvedValue(null);
    const r = await get('/mixta', firmar(SUPERVISOR));
    expect(r.status).toBe(401);
    expect(r.body.error.message).toBe('credenciales no validas');
    expect(AccesoLaboral.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { trabajadoreId: 7, estado: 1, tipo: 1 } }));
  });

  it('supervisor en ruta de administrador -> 403', async () => {
    const r = await get('/admin', firmar(SUPERVISOR));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });
});

describe('autenticarBodega: usuario intranet', () => {
  it('administrador válido -> 200 con contexto usuarios', async () => {
    const r = await get('/admin', firmar(ADMIN));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ id: 1, contexto: 'usuarios' });
  });

  it('administrador desactivado (token aún vigente) -> 401', async () => {
    Usuario.findById.mockResolvedValue({ id: 1, correo: ADMIN.correo, roleId: 1, estado: 0 });
    const r = await get('/admin', firmar(ADMIN));
    expect(r.status).toBe(401);
  });

  it('roleId del token distinto al de la BD -> 401', async () => {
    Usuario.findById.mockResolvedValue({ id: 1, correo: ADMIN.correo, roleId: 2, estado: 1 });
    const r = await get('/admin', firmar(ADMIN));
    expect(r.status).toBe(401);
  });

  it('token de acceso_clientes con id que coincide con un usuario -> 401', async () => {
    const r = await get('/mixta', firmar(CLIENTE));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_INVALID');
  });

  it('token de usuario_apps (sin expiración ni roleId) -> 401', async () => {
    const app = jwt.sign({ id: 1, nombre: 'App', correo: 'app@prueba.cl', celular: '9' }, CLAVE);
    const r = await get('/mixta', app);
    expect(r.status).toBe(401);
  });
});

describe('middleware/auth.autenticar (Aarón) frente a otros contextos: comportamiento documentado', () => {
  it('NO rechaza un token de acceso_clientes por sí solo: queda con rol null', async () => {
    const r = await get('/legacy-autenticar', firmar(CLIENTE));
    expect(r.status).toBe(200);
    expect(r.body.data.rol).toBeNull();
  });

  it('requerirRol lo frena después (403): hoy la protección depende de usar ambos', async () => {
    const r = await get('/legacy-admin', firmar(CLIENTE));
    expect(r.status).toBe(403);
  });
});
