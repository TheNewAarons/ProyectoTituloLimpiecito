/**
 * RNF-SEC-01 (AUT-006): las rutas /usuario exigen sesión (salvo login); la gestión es solo para los roles de
 * config/roles.js; ver/editar/cambiar contraseña también para el propio usuario, sin poder cambiarse rol ni estado.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn((cb) => Promise.resolve().then(() => cb({ id: 'tx' }))) } }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn().mockResolvedValue({ id: 1 }) }));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn(async (id) => ({ 1: { nombre: 'Administrador' }, 2: { nombre: 'Operaciones' } }[id] || null))
}));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../api/apartado_base/usuario/logica', () => ({
  buscarUsuarioCorreoDB: jest.fn(),
  buscarUsuarioCorreoTrueDB: jest.fn(),
  buscarUsuarioIdDB: jest.fn(),
  crearUsuarioDB: jest.fn(),
  editarUsuarioDB: jest.fn(),
  activarUsuarioDB: jest.fn(),
  desactivarUsuarioDB: jest.fn(),
  obtenerUsuariosActivosDB: jest.fn(),
  obtenerUsuariosInactivosDB: jest.fn(),
  buscarUsuariosActivosDB: jest.fn(),
  buscarUsuariosInactivosDB: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('../../config/auth');

const b64 = (s) => Buffer.from(s).toString('base64');
const token = (id, roleId) => jwt.sign({ id, roleId, correo: 'u' + id + '@x.cl' }, process.env.SECRET_KEY, { expiresIn: '1h' });
const ADMIN = token(1, 1);
const OPERACIONES = token(5, 2);

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/usuario', require('../../api/apartado_base/usuario/routes'));
  app.use(require('../../middleware/errores').manejadorErrores);
  return app;
};

const GESTION = [
  ['post', '/usuario/registro'],
  ['get', '/usuario/obtener'],
  ['get', '/usuario/obtener-inactivo'],
  ['get', '/usuario/busca-activo/ana'],
  ['get', '/usuario/busca-inactivo/ana'],
  ['delete', '/usuario/eliminar/9'],
  ['delete', '/usuario/activar/9']
];
const PROPIAS = [
  ['get', '/usuario/rescatar/'],
  ['put', '/usuario/editar/'],
  ['put', '/usuario/editar-password/']
];
const cuerpo = { usuario: JSON.stringify({ nombre: 'N', apellido: 'A', correo: 'n@x.cl', rut: '1-9', password: b64('nueva'), estado: 1, roleId: 1 }) };

let logica;
let app;
let consola;
beforeAll(() => { consola = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => consola.mockRestore());
beforeEach(() => {
  jest.clearAllMocks();
  logica = require('../../api/apartado_base/usuario/logica');
  logica.editarUsuarioDB.mockResolvedValue([1]);
  logica.buscarUsuarioIdDB.mockResolvedValue({ id: 5, nombre: 'Op' });
  logica.obtenerUsuariosActivosDB.mockResolvedValue([]);
  logica.crearUsuarioDB.mockResolvedValue({ dataValues: { id: 9, correo: 'n@x.cl', password: '$2a$10$hash' } });
  logica.buscarUsuarioCorreoDB.mockResolvedValue(null);
  app = crearApp();
});

const llamar = (metodo, ruta, tk) => {
  const r = request(app)[metodo](ruta);
  if (tk) r.set('x-access-token', tk);
  return metodo === 'get' || metodo === 'delete' ? r : r.send(cuerpo);
};

describe('sin sesión', () => {
  it('todas las rutas salvo login responden 401 y no tocan la BD', async () => {
    for (const [m, ruta] of GESTION.concat(PROPIAS.map(([pm, pr]) => [pm, pr + '1']))) {
      const res = await llamar(m, ruta);
      expect([m, ruta, res.status]).toEqual([m, ruta, 401]);
    }
    expect(logica.editarUsuarioDB).not.toHaveBeenCalled();
    expect(logica.crearUsuarioDB).not.toHaveBeenCalled();
    expect(logica.obtenerUsuariosActivosDB).not.toHaveBeenCalled();
  });

  it('un token falso (firmado con otra clave) también da 401', async () => {
    const falso = jwt.sign({ id: 1, roleId: 1 }, 'x'.repeat(40));
    expect((await llamar('put', '/usuario/editar-password/1', falso)).status).toBe(401);
  });

  it('el login sigue siendo público', async () => {
    logica.buscarUsuarioCorreoTrueDB.mockResolvedValue(null);
    const res = await request(app).post('/usuario/login').send({ usuario: JSON.stringify({ correo: 'a@b.cl', password: b64('x') }) });
    expect(res.status).toBe(200);
    expect(res.text).toBe('Usuario no existe!');
  });
});

describe('rol que no gestiona usuarios (Operaciones)', () => {
  it('las rutas de gestión responden 403', async () => {
    for (const [m, ruta] of GESTION) {
      expect([ruta, (await llamar(m, ruta, OPERACIONES)).status]).toEqual([ruta, 403]);
    }
    expect(logica.crearUsuarioDB).not.toHaveBeenCalled();
  });

  it('puede ver y editar su propio perfil, pero no el de otro', async () => {
    for (const [m, ruta] of PROPIAS) {
      expect([ruta, (await llamar(m, ruta + '5', OPERACIONES)).status]).toEqual([ruta, 200]);
      expect([ruta, (await llamar(m, ruta + '1', OPERACIONES)).status]).toEqual([ruta, 403]);
    }
  });

  it('al editarse no puede cambiarse el rol ni el estado', async () => {
    await llamar('put', '/usuario/editar/5', OPERACIONES);
    await llamar('put', '/usuario/editar-password/5', OPERACIONES);
    for (const [, datos] of logica.editarUsuarioDB.mock.calls) {
      expect(datos.roleId).toBeUndefined();
      expect(datos.estado).toBeUndefined();
      expect(datos.nombre).toBe('N');
    }
    expect(logica.editarUsuarioDB.mock.calls[1][1].password).toMatch(/^\$2[aby]\$/);
  });
});

describe('administrador', () => {
  it('gestiona usuarios y puede cambiar rol y estado de otros', async () => {
    expect((await llamar('get', '/usuario/obtener', ADMIN)).status).toBe(200);
    await llamar('put', '/usuario/editar/9', ADMIN);
    expect(logica.editarUsuarioDB).toHaveBeenLastCalledWith('9', expect.objectContaining({ roleId: 1, estado: 1 }));
  });

  it('crear usuario responde sin password', async () => {
    const res = await llamar('post', '/usuario/registro', ADMIN);
    expect(res.body.usuario).toEqual({ id: 9, correo: 'n@x.cl' });
  });
});

describe('ROLES_GESTION_USUARIOS', () => {
  const previo = process.env.ROLES_GESTION_USUARIOS;
  afterEach(() => {
    if (previo === undefined) delete process.env.ROLES_GESTION_USUARIOS; else process.env.ROLES_GESTION_USUARIOS = previo;
    jest.resetModules();
  });

  it('vacía = solo Administrador', () => {
    delete process.env.ROLES_GESTION_USUARIOS;
    jest.resetModules();
    const roles = require('../../config/roles');
    expect(roles.ROLES_GESTION_USUARIOS).toEqual(['Administrador']);
    expect(roles.gestionaUsuarios('ADMINISTRADOR')).toBe(true);
    expect(roles.gestionaUsuarios('Operaciones')).toBe(false);
    expect(roles.gestionaUsuarios(null)).toBe(false);
  });

  it('agregar un rol en la variable lo habilita sin tocar código', async () => {
    process.env.ROLES_GESTION_USUARIOS = 'Administrador, operaciones';
    jest.resetModules();
    const logicaNueva = require('../../api/apartado_base/usuario/logica');
    logicaNueva.obtenerUsuariosActivosDB.mockResolvedValue([]);
    logicaNueva.editarUsuarioDB.mockResolvedValue([1]);
    app = crearApp();
    expect((await llamar('get', '/usuario/obtener', OPERACIONES)).status).toBe(200);
    await llamar('put', '/usuario/editar/9', OPERACIONES);
    expect(logicaNueva.editarUsuarioDB).toHaveBeenLastCalledWith('9', expect.objectContaining({ roleId: 1 }));
  });
});
