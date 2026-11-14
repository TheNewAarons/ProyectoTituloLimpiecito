/**
 * RNF-SEC-02 — A1 login admin a nivel ENDPOINT (supertest).
 * api/apartado_base/usuario/controlador.js#login montado como POST /usuario/login.
 * Verifica fila LOGIN_FALLIDO/LOGIN_OK via registrarLogin real (auditar mockeado),
 * sin password/hash/token en valores, y fail-open de la respuesta HTTP.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../api/apartado_base/usuario/logica', () => ({
  buscarUsuarioCorreoTrueDB: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../../database/database');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/usuario/logica');
const router = require('../../api/apartado_base/usuario/routes');

const CLAVE = 'secreta123';
const USUARIO_BD = {
  id: 7,
  correo: 'admin@limpiecito.cl',
  password: bcrypt.hashSync(CLAVE, 10),
  dataValues: { id: 7, correo: 'admin@limpiecito.cl' }
};

const cuerpo = (correo, clave) => ({
  usuario: JSON.stringify({ correo, password: Buffer.from(clave).toString('base64') })
});

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

describe('POST /usuario/login (A1) — auditoria de login', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb({ id: 'tx' })));
    auditar.mockResolvedValue({ id: 1 });
    app = express();
    app.use(express.json());
    app.use('/usuario', router);
  });

  it('password incorrecta -> responde igual que siempre y audita LOGIN_FALLIDO con correo y motivo, sin password/hash/token', async () => {
    logica.buscarUsuarioCorreoTrueDB.mockResolvedValue(USUARIO_BD);

    const res = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', 'mala'));

    expect(res.status).toBe(200);
    expect(res.text).toBe('Contraseña Incorrecta!');
    expect(auditar).toHaveBeenCalledTimes(1);
    const [params] = auditar.mock.calls[0];
    expect(params.accion).toBe('LOGIN_FALLIDO');
    expect(params.motivo).toBe('PASSWORD_INCORRECTA');
    expect(params.usuario).toEqual({ id: 7, contexto: 'usuarios' });
    expect(params.despues).toEqual({ correo: 'admin@limpiecito.cl' });
    expect(JSON.stringify(params)).not.toMatch(/secreta123|Contraseña|\$2a\$|token/i);
  });

  it('usuario inexistente -> audita LOGIN_FALLIDO USUARIO_NO_EXISTE con usuarioId null', async () => {
    logica.buscarUsuarioCorreoTrueDB.mockResolvedValue(null);

    const res = await request(app).post('/usuario/login').send(cuerpo('nadie@x.cl', 'mala'));

    expect(res.status).toBe(200);
    expect(res.text).toBe('Usuario no existe!');
    const [params] = auditar.mock.calls[0];
    expect(params.accion).toBe('LOGIN_FALLIDO');
    expect(params.motivo).toBe('USUARIO_NO_EXISTE');
    expect(params.usuario).toEqual({ id: null, contexto: 'usuarios' });
    expect(params.despues).toEqual({ correo: 'nadie@x.cl' });
  });

  it('login OK -> audita LOGIN_OK y responde token', async () => {
    logica.buscarUsuarioCorreoTrueDB.mockResolvedValue(USUARIO_BD);

    const res = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', CLAVE));

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const [params] = auditar.mock.calls[0];
    expect(params.accion).toBe('LOGIN_OK');
    expect(params.motivo).toBeNull();
    expect(params.despues).toEqual({ correo: 'admin@limpiecito.cl' });
    expect(JSON.stringify(params)).not.toMatch(/secreta123|\$2a\$/i);
  });

  it('fail-open: con auditar lanzando, la respuesta HTTP del login es identica a la de sin fallo (OK y fallido)', async () => {
    logica.buscarUsuarioCorreoTrueDB.mockResolvedValue(USUARIO_BD);

    const okSinFallo = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', CLAVE));
    const maloSinFallo = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', 'mala'));

    auditar.mockRejectedValue(new Error('caida auditoria'));
    const okConFallo = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', CLAVE));
    const maloConFallo = await request(app).post('/usuario/login').send(cuerpo('admin@limpiecito.cl', 'mala'));

    expect(okConFallo.status).toBe(okSinFallo.status);
    expect(Boolean(okConFallo.body.token)).toBe(Boolean(okSinFallo.body.token));
    expect(maloConFallo.status).toBe(maloSinFallo.status);
    expect(maloConFallo.text).toBe(maloSinFallo.text);
  });
});
