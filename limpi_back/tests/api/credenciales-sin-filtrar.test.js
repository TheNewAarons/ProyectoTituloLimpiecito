/**
 * RNF-SEC-01 (AUT-004): tokens de sesión sin hash, respuestas del acceso laboral sin password,
 * nada de credenciales en los logs y editar un acceso laboral sin contraseña conserva la actual.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn((cb) => Promise.resolve().then(() => cb({ id: 'tx' }))) } }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn().mockResolvedValue({ id: 1 }) }));
jest.mock('../../api/apartado_base/usuario/logica', () => ({ buscarUsuarioCorreoTrueDB: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ belongsTo: jest.fn(), update: jest.fn().mockResolvedValue([1]), findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sist_app/Usuario_app', () => ({ findOne: jest.fn(), create: jest.fn() }));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('../../config/auth');

const HASH = bcrypt.hashSync('clave', 4);
const HASH_RE = /\$2[aby]\$/;
const b64 = (s) => Buffer.from(s).toString('base64');
const resFalsa = () => {
  const res = { status: () => res, json: (b) => { res.body = b; return res; } };
  return res;
};

let logs;
beforeEach(() => {
  jest.clearAllMocks();
  logs = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')));
});
afterEach(() => console.log.mockRestore());

describe('login de usuarios del sistema', () => {
  it('el token no lleva el hash pero conserva lo que usa el front, y no se escribe en el log', async () => {
    require('../../api/apartado_base/usuario/logica').buscarUsuarioCorreoTrueDB.mockResolvedValue({
      id: 7,
      password: HASH,
      dataValues: { id: 7, nombre: 'Ana', apellido: 'P', correo: 'a@b.cl', rut: '1-9', estado: true, roleId: 1, password: HASH, role: { id: 1, nombre: 'ADMINISTRADOR' } }
    });
    const app = express();
    app.use(express.json());
    app.use('/usuario', require('../../api/apartado_base/usuario/routes'));
    const res = await request(app).post('/usuario/login').send({ usuario: JSON.stringify({ correo: 'a@b.cl', password: b64('clave') }) });
    const datos = jwt.decode(res.body.token);
    expect(datos.password).toBeUndefined();
    expect(JSON.stringify(datos)).not.toMatch(HASH_RE);
    expect(datos).toMatchObject({ id: 7, nombre: 'Ana', correo: 'a@b.cl', rut: '1-9', roleId: 1, role: { nombre: 'ADMINISTRADOR' } });
    expect(logs.join('\n')).not.toContain(res.body.token);
  });
});

describe('acceso laboral (trabajadores)', () => {
  const logica = () => require('../../api/sistema_intranet/accesos_laborales/logica');
  const controlador = () => require('../../api/sistema_intranet/accesos_laborales/controlador');
  const Acceso = () => require('../../modelos/sistema_intranet/acceso_laboral');
  const fila = () => ({ id: 1, correo: 't@x.cl', password: HASH, tipo: 1, trabajadoreId: 5, toJSON() { return { id: 1, correo: 't@x.cl', password: HASH, tipo: 1, trabajadoreId: 5 }; } });

  it('login (OK y contraseña incorrecta) responde sin password y no escribe las credenciales en el log', async () => {
    Acceso().findOne.mockResolvedValue(fila());
    require('../../modelos/sistema_base/Trabajadore').findOne.mockResolvedValue({ estado: 1, nombre: 'A', apellido: 'B', dataValues: { id: 5, estado: 1 } });
    for (const clave of ['clave', 'mala']) {
      const res = resFalsa();
      await controlador().login({ body: { credenciales: { correo: 't@x.cl', password: clave } } }, res);
      expect(res.body.acceso_laboral.correo).toBe('t@x.cl');
      expect(res.body.acceso_laboral.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(HASH_RE);
    }
    expect(logs.join('\n')).not.toMatch(/clave|mala/);
  });

  it('existe / obtener / crear responden sin password', async () => {
    Acceso().findOne.mockResolvedValue(fila());
    Acceso().create.mockResolvedValue(fila());
    const r1 = resFalsa();
    await controlador().existeAccesoLaboral({ params: { id_trabajador: 5 } }, r1);
    const r2 = resFalsa();
    await controlador().obtenerAccesoLaboralPorIdTrabajador({ params: { id_trabajador: 5 } }, r2);
    const r3 = resFalsa();
    await controlador().crearAccesoLaboral({ body: { acceso_laboral: { correo: 't@x.cl', password: 'clave', estado: 1, tipo: 1, trabajadoreId: 5 } } }, r3);
    [r1, r2, r3].forEach((r) => {
      expect(r.body.acceso_laboral.id).toBe(1);
      expect(JSON.stringify(r.body)).not.toMatch(HASH_RE);
    });
  });

  it('existe sin acceso sigue respondiendo null', async () => {
    Acceso().findOne.mockResolvedValue(null);
    const r = resFalsa();
    await controlador().existeAccesoLaboral({ params: { id_trabajador: 5 } }, r);
    expect(r.body).toEqual({ acceso_laboral: null, estado: false });
  });

  it('editar sin contraseña conserva la actual; con contraseña la cambia (hash)', async () => {
    await logica().actualizarAccesoLaboralDB('1', { correo: 'n@x.cl', tipo: 2 });
    expect(Acceso().update).toHaveBeenLastCalledWith({ correo: 'n@x.cl', tipo: 2 }, { where: { id: 1 } });
    await logica().actualizarAccesoLaboralDB('1', { correo: 'n@x.cl', tipo: 2, password: 'nueva' });
    const [valores] = Acceso().update.mock.calls[1];
    expect(bcrypt.compareSync('nueva', valores.password)).toBe(true);
  });
});

describe('registro de usuarios de la app', () => {
  it('no escribe los datos ni la contraseña en el log', async () => {
    const UsuarioApp = require('../../modelos/sist_app/Usuario_app');
    UsuarioApp.findOne.mockResolvedValue(null);
    UsuarioApp.create.mockResolvedValue({ dataValues: { id: 9, nombre: 'C', correo: 'c@x.cl' } });
    const app = express();
    app.use(express.json());
    app.use('/app_lim/usuario', require('../../routes/rutas_app/Usuario'));
    const res = await request(app).post('/app_lim/usuario/registro').send({ usuario: { nombre: 'C', correo: 'c@x.cl', password: b64('secreta-app'), estado: 1 } });
    expect(typeof res.body.token).toBe('string');
    expect(logs.join('\n')).not.toMatch(/secreta-app|c2VjcmV0YS1hcHA/);
  });
});
