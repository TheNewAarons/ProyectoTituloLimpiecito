/**
 * RNF-SEC-01 (AUT-005, parte 1): clave JWT solo desde el entorno y sesiones de 8 h en todos los contextos.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn((cb) => Promise.resolve().then(() => cb({ id: 'tx' }))) } }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn().mockResolvedValue({ id: 1 }) }));
jest.mock('../../api/apartado_base/usuario/logica', () => ({ buscarUsuarioCorreoTrueDB: jest.fn() }));
jest.mock('../../modelos/sist_app/Usuario_app', () => ({ findOne: jest.fn() }));
jest.mock('../../api/sistema_intranet/accesos_laborales/logica', () => ({ loginDB: jest.fn(), obtenerTrabajadorPorIdDB: jest.fn() }));
jest.mock('../../api/sistema_extranet_cliente/logica', () => ({ obtenerAccesoClientePorCorreoDB: jest.fn() }));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const RAIZ = path.join(__dirname, '..', '..');
const OCHO_HORAS = 8 * 3600;
const duracion = (token) => { const d = jwt.decode(token); return d.exp - d.iat; };
const HASH = bcrypt.hashSync('clave', 4);
const b64 = (s) => Buffer.from(s).toString('base64');
const resFalsa = () => {
  const res = { status: () => res, json: (b) => { res.body = b; return res; }, send: (b) => { res.body = b; return res; } };
  return res;
};

let consola;
beforeAll(() => { consola = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => consola.mockRestore());

describe('config/auth', () => {
  const ENV = Object.assign({}, process.env);
  afterEach(() => { process.env = Object.assign({}, ENV); jest.resetModules(); });

  it('exigirSecreto detiene el arranque si falta SECRET_KEY (fuera de Jest)', () => {
    delete process.env.SECRET_KEY;
    delete process.env.JEST_WORKER_ID;
    const auth = require('../../config/auth');
    expect(() => auth.exigirSecreto()).toThrow(/SECRET_KEY/);
    process.env.SECRET_KEY = ENV.SECRET_KEY || 'x';
    expect(() => auth.exigirSecreto()).not.toThrow();
  });

  it('las sesiones duran 8h por defecto y JWT_EXPIRES_IN las cambia', () => {
    delete process.env.JWT_EXPIRES_IN;
    expect(require('../../config/auth').expiraEn).toBe('8h');
    jest.resetModules();
    process.env.JWT_EXPIRES_IN = '2h';
    expect(require('../../config/auth').expiraEn).toBe('2h');
  });
});

describe('sesiones de 8 h firmadas con SECRET_KEY del entorno', () => {
  beforeAll(() => { require('../../config/auth'); delete process.env.JWT_EXPIRES_IN; });

  it('usuarios del sistema (POST /usuario/login)', async () => {
    require('../../api/apartado_base/usuario/logica').buscarUsuarioCorreoTrueDB.mockResolvedValue({ id: 7, password: HASH, dataValues: { id: 7 } });
    const app = express();
    app.use(express.json());
    app.use('/usuario', require('../../api/apartado_base/usuario/routes'));
    const res = await request(app).post('/usuario/login').send({ usuario: JSON.stringify({ correo: 'a@b.cl', password: b64('clave') }) });
    expect(duracion(res.body.token)).toBe(OCHO_HORAS);
    expect(() => jwt.verify(res.body.token, process.env.SECRET_KEY)).not.toThrow();
  });

  it('usuarios de la app (antes no vencían)', async () => {
    require('../../modelos/sist_app/Usuario_app').findOne.mockResolvedValue({ id: 3, password: HASH, dataValues: { id: 3, nombre: 'x', correo: 'c@x.cl' } });
    const app = express();
    app.use(express.json());
    app.use('/app_lim/login', require('../../routes/rutas_app/Login'));
    const res = await request(app).post('/app_lim/login/login').send({ login: { correo: 'c@x.cl', password: b64('clave') } });
    expect(duracion(res.body.token)).toBe(OCHO_HORAS);
  });

  it('trabajadores (acceso laboral, antes 1 día)', async () => {
    const logica = require('../../api/sistema_intranet/accesos_laborales/logica');
    logica.loginDB.mockResolvedValue({ id: 1, tipo: 1, trabajadoreId: 5, password: HASH });
    logica.obtenerTrabajadorPorIdDB.mockResolvedValue({ estado: 1, nombre: 'A', apellido: 'B', dataValues: { id: 5, estado: 1 } });
    const res = resFalsa();
    await require('../../api/sistema_intranet/accesos_laborales/controlador').login({ body: { credenciales: { correo: 't@x.cl', password: 'clave' } } }, res);
    expect(duracion(res.body.token)).toBe(OCHO_HORAS);
  });

  it('clientes de la extranet (antes 7 días)', async () => {
    require('../../api/sistema_extranet_cliente/logica').obtenerAccesoClientePorCorreoDB.mockResolvedValue({ id: 2, password: HASH, dataValues: { id: 2, password: HASH } });
    const res = resFalsa();
    await require('../../api/sistema_extranet_cliente/controlador').inicioSesion({ body: { correo: 'c@x.cl', password: 'clave' } }, res);
    expect(duracion(res.body.token)).toBe(OCHO_HORAS);
  });
});

describe('chequeo estático del código (sin tests ni node_modules)', () => {
  const archivos = [];
  const recorrer = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'tests', '.git', 'migrations'].includes(e.name)) recorrer(p); } else if (e.name.endsWith('.js')) archivos.push(p);
  });
  recorrer(RAIZ);
  const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');

  it('nadie asigna SECRET_KEY con un literal (salvo la clave solo-Jest de config/auth.js)', () => {
    const con = archivos.filter((p) => /process\.env\.SECRET_KEY\s*=[^=]/.test(fs.readFileSync(p, 'utf8'))).map(rel);
    expect(con).toEqual(['config/auth.js']);
  });

  it('services/jwt.js ya no existe ni se importa', () => {
    expect(fs.existsSync(path.join(RAIZ, 'services', 'jwt.js'))).toBe(false);
    expect(archivos.filter((p) => /services\/jwt['"]/.test(fs.readFileSync(p, 'utf8'))).map(rel)).toEqual([]);
  });

  it('toda sesión firmada en rutas montadas usa expiraEn', () => {
    // Recuperación de contraseña: token propio de 1 h. sistema_base/*: rutas legacy no montadas en index.js.
    const fuera = ['services/seguridad/recuperacion.js', 'routes/sistema_base/Usuario.js', 'routes/sistema_base/Recuperar_pass.js'];
    const malas = [];
    archivos.filter((p) => !fuera.includes(rel(p))).forEach((p) => {
      const lineas = fs.readFileSync(p, 'utf8').split('\n');
      lineas.forEach((l, i) => {
        if (/jwt\.sign\(/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/expiresIn:\s*expiraEn/.test(lineas.slice(i, i + 3).join(' '))) malas.push(rel(p) + ':' + (i + 1));
      });
    });
    expect(malas).toEqual([]);
  });
});
