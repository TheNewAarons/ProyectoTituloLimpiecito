/**
 * RNF-SEC-02 — identificarOpcional (D-074): decodifica el token si es válido (mismo req.usuario que
 * autenticar) y NUNCA rechaza ante token ausente/inválido/expirado o fallo al cargar el rol.
 * Se prueba por HTTP (supertest) porque asyncHandler no devuelve la promesa interna; jsonwebtoken real.
 */
jest.mock('../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Role = require('../modelos/sistema_base/Role');
const Usuario = require('../modelos/sistema_base/Usuario');
const { autenticar, identificarOpcional } = require('../middleware/auth');
const { manejadorErrores } = require('../middleware/errores');

const CLAVE = 'clave-de-prueba-identificar-opcional';

function app() {
  const a = express();
  a.get('/opcional', identificarOpcional, (req, res) => res.json({ ok: true, data: req.usuario || null }));
  a.get('/autenticar', autenticar, (req, res) => res.json({ ok: true, data: req.usuario }));
  a.use(manejadorErrores);
  return a;
}

const get = (ruta, token) => {
  const r = request(app()).get(ruta);
  return token ? r.set('x-access-token', token) : r;
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  Role.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, nombre: 'Administrador' } : null));
  Usuario.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, correo: 'a@a.com' } : null));
});

describe('middleware/auth.identificarOpcional', () => {
  it('sin token -> 200 con data null (sin req.usuario)', async () => {
    const res = await get('/opcional');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('token inválido -> 200 con data null (sin error)', async () => {
    const res = await get('/opcional', 'esto.no.es-un.jwt');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('token expirado -> 200 con data null (sin error)', async () => {
    const res = await get('/opcional', jwt.sign({ id: 1 }, CLAVE, { expiresIn: -10 }));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('fallo al cargar el rol -> 200 con data null (sin propagar)', async () => {
    Role.findById.mockRejectedValue(new Error('bd caida'));
    const res = await get('/opcional', jwt.sign({ id: 1, roleId: 1, correo: 'a@a.com' }, CLAVE));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('payload sin roleId -> 200 con data null (no atribuye Admin falso)', async () => {
    const res = await get('/opcional', jwt.sign({ id: 1, correo: 'a@a.com' }, CLAVE));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(Usuario.findById).not.toHaveBeenCalled();
  });

  it('correo del payload distinto al de la BD -> 200 con data null', async () => {
    const res = await get('/opcional', jwt.sign({ id: 1, roleId: 1, correo: 'otro@x.cl' }, CLAVE));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('usuario inexistente en BD -> 200 con data null', async () => {
    const res = await get('/opcional', jwt.sign({ id: 99, roleId: 1, correo: 'a@a.com' }, CLAVE));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('token válido -> mismo req.usuario que autenticar (incluye rol_nombre)', async () => {
    const token = jwt.sign({ id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 }, CLAVE);
    const opt = await get('/opcional', token);
    const auth = await get('/autenticar', token);

    expect(opt.status).toBe(200);
    expect(auth.status).toBe(200);
    expect(opt.body.data).toEqual(auth.body.data);
    expect(opt.body.data).toEqual({ id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1, rol_nombre: 'Administrador', contexto: 'usuarios' });
  });
});
