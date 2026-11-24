/**
 * Obs. 22-24 (AUT-019) — Anuncios de la web:
 * - legacy /anuncios_web detrás de middleware/anuncios-protegidos (GET libre; escribir exige Admin);
 * - crear valida la imagen (400 claro, sin caer el proceso) y eliminar tolera la imagen ausente;
 * - PUT /api/v1/web/anuncios/:id/imagen reemplaza la imagen (Admin), conserva la anterior y audita.
 * jsonwebtoken real; modelos simulados; los archivos subidos se borran al final.
 */
jest.mock('../../database/database', () => ({
  sequelize: { transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })) }
}));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ nombre: { 1: 'Administrador', 2: 'Operaciones' }[id] || 'Otro' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })) }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sistema_web/Anuncio', () => ({
  count: jest.fn(), findAll: jest.fn(), create: jest.fn(), findById: jest.fn(), destroy: jest.fn(), update: jest.fn()
}));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Anuncio = require('../../modelos/sistema_web/Anuncio');
const { auditar } = require('../../services/auditoria');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores } = require('../../middleware/errores');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');

const CLAVE = 'clave-de-prueba-aut-019';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 2, correo: 'u2@prueba.cl', roleId: 2 }, CLAVE);
const JPG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const TEXTO = Buffer.from('no soy una imagen');
const DIR_LEGACY = path.resolve('uploads_limpiecitoweb');
const DIR_V1 = path.resolve('uploads_limpiecitoweb', 'publicaciones');

function app() {
  const a = express();
  a.use(express.json());
  // Igual que index.js: middleware antes del router legacy, y el v1 con autenticar + requerirRol(Admin).
  a.use('/anuncios_web', require('../../middleware/anuncios-protegidos'));
  a.use('/anuncios_web', require('../../routes/sistema_web/Anuncios'));
  a.use('/api/v1/web/anuncios', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), require('../../api/v1/web/anuncios/routes'));
  a.use(manejadorErrores);
  return a;
}
const conToken = (r, token) => (token ? r.set('x-access-token', token) : r);
const crear = (token, archivo) => {
  const r = conToken(request(app()).post('/anuncios_web/crear_anuncio/crear'), token)
    .field('titulo', 'Día de la Madre').field('sub_titulo', 'Saludo').field('descripcion', 'Texto').field('usuarioId', '1');
  return archivo ? r.attach('imagen', archivo.buf, archivo.nombre) : r;
};
const reemplazar = (id, token, archivo) => {
  const r = conToken(request(app()).put('/api/v1/web/anuncios/' + id + '/imagen'), token);
  return archivo ? r.attach('imagen', archivo.buf, archivo.nombre) : r;
};
const listar = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()) : []);

let antesLegacy;
let antesV1;
let anuncio;
let consoleError;
beforeAll(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  antesLegacy = listar(DIR_LEGACY);
  antesV1 = listar(DIR_V1);
});
afterAll(() => {
  consoleError.mockRestore();
  // Borra solo lo que subieron estos tests.
  listar(DIR_LEGACY).filter((f) => antesLegacy.indexOf(f) === -1).forEach((f) => fs.unlinkSync(path.join(DIR_LEGACY, f)));
  listar(DIR_V1).filter((f) => antesV1.indexOf(f) === -1).forEach((f) => fs.unlinkSync(path.join(DIR_V1, f)));
});
beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  anuncio = { id: 7, imagen: 'uploads_limpiecitoweb/no-existe.jpg', update: jest.fn(async function (c) { Object.assign(anuncio, c); return anuncio; }) };
  Anuncio.count.mockResolvedValue(0);
  Anuncio.findAll.mockResolvedValue([]);
  Anuncio.create.mockImplementation(async (d) => Object.assign({ id: 8 }, d));
  Anuncio.findById.mockImplementation(async (id) => (Number(id) === 7 ? anuncio : null));
  Anuncio.destroy.mockResolvedValue(1);
});

describe('legacy /anuncios_web con sesión (obs. 24)', () => {
  it('la lectura sigue libre para la web pública', async () => {
    const r = await request(app()).get('/anuncios_web/obtener_anuncio/obtener/');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ anuncios: [], cant_anuncios: 0 });
  });

  it('crear, editar y eliminar sin sesión: 401 sin tocar la BD', async () => {
    expect((await crear(null, { buf: JPG, nombre: 'a.jpg' })).status).toBe(401);
    expect((await request(app()).put('/anuncios_web/editar_anuncio/editar/7').send({ titulo: 'x' })).status).toBe(401);
    expect((await request(app()).delete('/anuncios_web/eliminar_anuncio/eliminar/7')).status).toBe(401);
    expect(Anuncio.count).not.toHaveBeenCalled();
    expect(Anuncio.update).not.toHaveBeenCalled();
    expect(Anuncio.destroy).not.toHaveBeenCalled();
  });

  it('un rol distinto de Administrador: 403', async () => {
    expect((await crear(OPERACIONES, { buf: JPG, nombre: 'a.jpg' })).status).toBe(403);
    expect(Anuncio.create).not.toHaveBeenCalled();
  });
});

describe('crear anuncio (obs. 23)', () => {
  it('sin imagen: 400 con mensaje (antes detenía el backend)', async () => {
    const r = await crear(ADMIN);
    expect(r.status).toBe(400);
    expect(r.body.mensaje).toMatch(/Debe subir una imagen/);
    expect(Anuncio.create).not.toHaveBeenCalled();
  });

  it('archivo que no es imagen (aunque se llame .jpg): 400 y el archivo se borra', async () => {
    const r = await crear(ADMIN, { buf: TEXTO, nombre: 'falsa.jpg' });
    expect(r.status).toBe(400);
    expect(r.body.mensaje).toMatch(/jpg, png o webp/);
    expect(Anuncio.create).not.toHaveBeenCalled();
    expect(listar(DIR_LEGACY).filter((f) => antesLegacy.indexOf(f) === -1)).toHaveLength(0);
  });

  it('imagen válida: crea el anuncio como antes', async () => {
    const r = await crear(ADMIN, { buf: JPG, nombre: 'madre.jpg' });
    expect(r.status).toBe(200);
    expect(r.body.anuncio).toMatchObject({ titulo: 'Día de la Madre' });
    expect(Anuncio.create.mock.calls[0][0].imagen).toMatch(/uploads_limpiecitoweb/);
  });

  it('ya existe un anuncio: responde como antes y no deja el archivo subido', async () => {
    Anuncio.count.mockResolvedValue(1);
    const r = await crear(ADMIN, { buf: JPG, nombre: 'otra.jpg' });
    expect(r.body).toEqual({ existe: true, mensaje: 'Solo puede crear un anuncio' });
    expect(Anuncio.create).not.toHaveBeenCalled();
  });
});

describe('eliminar anuncio (obs. 22)', () => {
  it('con la imagen ausente en disco: elimina y responde OK sin detener el backend', async () => {
    const r = await conToken(request(app()).delete('/anuncios_web/eliminar_anuncio/eliminar/7'), ADMIN);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ eliminar: true, mensaje: 'Tu Anuncio Ha Sido Eliminado' });
  });
});

describe('PUT /api/v1/web/anuncios/:id/imagen (obs. 23)', () => {
  it('reemplaza la imagen, conserva la anterior y audita', async () => {
    const r = await reemplazar(7, ADMIN, { buf: JPG, nombre: 'nueva.jpg' });
    expect(r.status).toBe(200);
    expect(r.body.data.imagen).toMatch(/^uploads_limpiecitoweb\/publicaciones\/.+\.jpg$/);
    expect(anuncio.imagen).toBe(r.body.data.imagen);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'anuncios', entidad_id: 7, accion: 'REEMPLAZAR_IMAGEN',
      antes: { imagen: 'uploads_limpiecitoweb/no-existe.jpg' }, despues: { imagen: r.body.data.imagen }
    }));
  });

  it('sin imagen: 400', async () => {
    const r = await reemplazar(7, ADMIN);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('IMAGEN_REQUERIDA');
  });

  it('contenido que no es imagen: rechazado y el archivo se borra', async () => {
    const r = await reemplazar(7, ADMIN, { buf: TEXTO, nombre: 'falsa.png' });
    expect(r.status).toBe(422);
    expect(anuncio.update).not.toHaveBeenCalled();
    await new Promise((ok) => setTimeout(ok, 50)); // borrarImagen es asíncrono
    expect(listar(DIR_V1).filter((f) => antesV1.indexOf(f) === -1)).toHaveLength(1); // solo la del test anterior
  });

  it('anuncio inexistente: 404', async () => {
    expect((await reemplazar(99, ADMIN, { buf: JPG, nombre: 'x.jpg' })).status).toBe(404);
  });

  it('sin sesión 401 y sin rol Administrador 403', async () => {
    expect((await reemplazar(7, null, { buf: JPG, nombre: 'x.jpg' })).status).toBe(401);
    expect((await reemplazar(7, OPERACIONES, { buf: JPG, nombre: 'x.jpg' })).status).toBe(403);
    expect(anuncio.update).not.toHaveBeenCalled();
  });
});
