/**
 * RNF-SEC-01 (AUT-001): recuperación de contraseña del sistema y de la app.
 * El cambio solo lo autoriza el token del correo, cambia solo al dueño del token,
 * sirve una vez y no acepta tokens de sesión, de la app en el sistema ni el cuerpo antiguo (id/correo/hash).
 */
const mockTabla = () => {
  const filas = [];
  return {
    filas,
    findOne: jest.fn(async ({ where }) => {
      const f = filas.find((u) => Object.keys(where).every((k) => u[k] === where[k]));
      return f ? Object.assign({}, f, { dataValues: Object.assign({}, f) }) : null;
    }),
    update: jest.fn(async (valores, { where }) => {
      const f = filas.filter((u) => u.id === where.id);
      f.forEach((u) => Object.assign(u, valores));
      return [f.length];
    })
  };
};
jest.mock('../../modelos/sistema_base/Usuario', () => mockTabla());
jest.mock('../../modelos/sist_app/Usuario_app', () => mockTabla());
const mockEnviados = [];
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    use: () => {},
    sendMail: (opciones, cb) => { mockEnviados.push(opciones); cb(null, {}); }
  })
}));
jest.mock('nodemailer-express-handlebars', () => () => () => {});

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../../modelos/sistema_base/Usuario');
const UsuarioApp = require('../../modelos/sist_app/Usuario_app');

const b64 = (s) => Buffer.from(s).toString('base64');
const app = express();
app.use(express.json());
app.use('/recuperar', require('../../api/apartado_base/recuperar_pass/routes'));
app.use('/app_lim/recuperar', require('../../routes/rutas_app/Recuperar_password'));

const ultimoToken = () => {
  const correo = mockEnviados[mockEnviados.length - 1];
  const url = correo.context ? correo.context.url : correo.text.match(/(https?:\S+)/)[1];
  return url.split('/').pop();
};
const pedirToken = async (ruta, correo) => {
  await request(app).post(ruta + '/recuperar-password').send({ correo });
  return ultimoToken();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnviados.length = 0;
  Usuario.filas.length = 0;
  Usuario.filas.push(
    { id: 1, correo: 'admin@limpiecito.cl', password: bcrypt.hashSync('admin-original', 4), roleId: 1 },
    { id: 2, correo: 'vendedor@limpiecito.cl', password: bcrypt.hashSync('vendedor-original', 4), roleId: 3 }
  );
  UsuarioApp.filas.length = 0;
  UsuarioApp.filas.push(
    { id: 1, correo: 'cliente1@x.cl', password: bcrypt.hashSync('cliente1-original', 4) },
    { id: 2, correo: 'cliente2@x.cl', password: bcrypt.hashSync('cliente2-original', 4) }
  );
});

const hashDe = (tabla, id) => tabla.filas.find((u) => u.id === id).password;

describe('POST /recuperar (usuarios del sistema)', () => {
  const R = '/recuperar';

  it('el token del correo no lleva el hash ni datos de sesión', async () => {
    const token = await pedirToken(R, 'vendedor@limpiecito.cl');
    const datos = jwt.decode(token);
    expect(Object.keys(datos).sort()).toEqual(['correo', 'exp', 'iat', 'id', 'proposito']);
    expect(datos.exp - datos.iat).toBe(3600);
    expect(JSON.stringify(datos)).not.toMatch(/\$2[aby]\$/);
  });

  it('cambia solo la contraseña del dueño del token, aunque el body traiga el id del admin', async () => {
    const hashAdmin = hashDe(Usuario, 1);
    const token = await pedirToken(R, 'vendedor@limpiecito.cl');
    const res = await request(app).post(R + '/cambiar-password').send({ token, newPass: b64('nueva-123'), id: 1, correo: 'admin@limpiecito.cl' });
    expect(res.body.mensaje).toBe('Contraseña editada correctamente');
    expect(res.body.filas[0]).toBe(1);
    expect(bcrypt.compareSync('nueva-123', hashDe(Usuario, 2))).toBe(true);
    expect(hashDe(Usuario, 1)).toBe(hashAdmin);
  });

  it('el enlace sirve una sola vez', async () => {
    const token = await pedirToken(R, 'vendedor@limpiecito.cl');
    await request(app).post(R + '/cambiar-password').send({ token, newPass: b64('nueva-123') });
    const res = await request(app).post(R + '/cambiar-password').send({ token, newPass: b64('otra-456') });
    expect(res.body.filas).toBeUndefined();
    expect(bcrypt.compareSync('nueva-123', hashDe(Usuario, 2))).toBe(true);
  });

  it('rechaza un token de sesión, el cuerpo antiguo (id/correo/hash), uno vencido y uno de la app', async () => {
    const admin = Usuario.filas[0];
    const vendedor = Usuario.filas[1];
    const sesion = jwt.sign(Object.assign({}, vendedor), process.env.SECRET_KEY, { expiresIn: '1d' });
    const vencido = jwt.sign(
      { id: 2, correo: vendedor.correo, proposito: 'RECUPERAR_USUARIO', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.SECRET_KEY + vendedor.password
    );
    const deApp = await pedirToken('/app_lim/recuperar', 'cliente2@x.cl');
    const intentos = [
      { token: sesion },
      { id: 1, correo: vendedor.correo, pass: vendedor.password },
      { token: vencido },
      { token: deApp },
      { token: 'basura' }
    ];
    for (const cuerpo of intentos) {
      const res = await request(app).post(R + '/cambiar-password').send(Object.assign({ newPass: b64('hackeada') }, cuerpo));
      expect(res.body.filas).toBeUndefined();
      expect(res.body.mensaje).toMatch(/no es válido/);
    }
    expect(Usuario.update).not.toHaveBeenCalled();
    expect(bcrypt.compareSync('admin-original', admin.password)).toBe(true);
  });

  it('sin contraseña nueva no cambia nada', async () => {
    const token = await pedirToken(R, 'vendedor@limpiecito.cl');
    const res = await request(app).post(R + '/cambiar-password').send({ token });
    expect(res.body.mensaje).toBe('Debes ingresar la nueva contraseña');
    expect(Usuario.update).not.toHaveBeenCalled();
  });
});

describe('POST /app_lim/recuperar (usuarios de la app)', () => {
  const R = '/app_lim/recuperar';

  it('cambia solo al dueño del token y una sola vez', async () => {
    const hash1 = hashDe(UsuarioApp, 1);
    const token = await pedirToken(R, 'cliente2@x.cl');
    expect(JSON.stringify(jwt.decode(token))).not.toMatch(/\$2[aby]\$/);
    const res = await request(app).post(R + '/cambiar-password').send({ token, newPass: b64('nueva-app'), id: 1 });
    expect(res.body.mensaje).toBe('Contraseña editada correctamente');
    expect(bcrypt.compareSync('nueva-app', hashDe(UsuarioApp, 2))).toBe(true);
    expect(hashDe(UsuarioApp, 1)).toBe(hash1);
    const otra = await request(app).post(R + '/cambiar-password').send({ token, newPass: b64('otra') });
    expect(otra.body.filas).toBeUndefined();
  });

  it('rechaza el token de sesión de la app y el cuerpo antiguo', async () => {
    const c2 = UsuarioApp.filas[1];
    const sesion = jwt.sign({ id: 2, nombre: 'x', correo: c2.correo }, process.env.SECRET_KEY);
    for (const cuerpo of [{ token: sesion }, { id: 1, correo: c2.correo, pass: c2.password }]) {
      const res = await request(app).post(R + '/cambiar-password').send(Object.assign({ newPass: b64('hackeada') }, cuerpo));
      expect(res.body.filas).toBeUndefined();
    }
    expect(UsuarioApp.update).not.toHaveBeenCalled();
  });
});
