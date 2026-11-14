/**
 * RF-WEB-03 — Vigencia en el tiempo de GET /api/v1/public/publicaciones (mock de findAll que
 * evalúa de verdad el `where` que construye filtroVigentes) y sanitización XSS en el alta Admin
 * (POST /api/v1/web/publicaciones) + reflejo en el listado público.
 *
 * No usa fake timers: supertest se cuelga con ellos. Se espía Date con jest.spyOn para fijar
 * "ahora" por test.
 */
const express = require('express');
const request = require('supertest');
const Sequelize = require('sequelize');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_web/Publicacion', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../libs/multer_publicaciones', () => ({
  subirImagen: () => (req, res, next) => next(),
  validarMagicBytes: jest.fn(async () => true),
  borrarImagen: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Publicacion = require('../../modelos/sistema_web/Publicacion');

const { autenticar, requerirRol } = require('../../middleware/auth');
const routerAdmin = require('../../api/v1/web/publicaciones/routes');
const routerPublic = require('../../api/v1/public/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const Op = Sequelize.Op;
const TOKEN_ADMIN = 'token-admin';

process.env.PREFIJO = '/web-limpiecito';

const T = new Date('2026-06-10T12:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

function pubMock(attrs) {
  const data = Object.assign({
    id: 1, titulo: 'Título', cuerpo: '<p>Contenido</p>', imagen: null,
    fecha_publicacion: new Date(T), fecha_expiracion: null, publicado: true
  }, attrs);
  const instancia = Object.assign({}, data, {
    update: jest.fn(async (cambios) => { Object.assign(data, cambios); }),
    get: () => Object.assign({}, data)
  });
  Object.defineProperty(instancia, 'publicado', { get: () => data.publicado });
  return instancia;
}

function buildAppAdmin() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/web/publicaciones', autenticar, requerirRol('Administrador'), routerAdmin);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

function buildAppPublic() {
  const app = express();
  app.use('/api/v1/public', routerPublic);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

// --- Mini evaluador del `where` de Sequelize (igualdad, null, Op.lte, Op.gt, Op.or) ---
function cumpleCondicion(fila, campo, cond) {
  const valor = fila[campo];
  if (cond !== null && typeof cond === 'object') {
    const llaves = Object.getOwnPropertySymbols(cond);
    if (llaves.length) {
      return llaves.every(function (s) {
        const esperado = cond[s];
        const v = valor instanceof Date ? valor.getTime() : valor;
        const e = esperado instanceof Date ? esperado.getTime() : esperado;
        if (s === Op.lte) return v <= e;
        if (s === Op.gt) return v > e;
        if (s === Op.gte) return v >= e;
        if (s === Op.lt) return v < e;
        throw new Error('operador no soportado en el mini evaluador: ' + String(s));
      });
    }
  }
  return valor === cond;
}

function cumpleWhere(fila, where) {
  return Object.keys(where).every(function (k) {
    if (k === String(Op.or) || k === 'or') {
      return where[k].some(function (sub) { return cumpleWhere(fila, sub); });
    }
    return cumpleCondicion(fila, k, where[k]);
  }) && Object.getOwnPropertySymbols(where).every(function (s) {
    if (s === Op.or) {
      return where[s].some(function (sub) { return cumpleWhere(fila, sub); });
    }
    throw new Error('símbolo no soportado en el mini evaluador: ' + String(s));
  });
}

function ordenDesc(filas, campo) {
  return filas.slice().sort(function (a, b) {
    return new Date(b[campo]).getTime() - new Date(a[campo]).getTime();
  });
}

// findAll que evalúa el where real y aplica el order que pide el controlador.
function mockearFindAllReal(fixtures) {
  Publicacion.findAll.mockImplementation(async (opciones) => {
    const filas = fixtures.filter(function (f) { return cumpleWhere(f, opciones.where); });
    const orden = opciones.order || [];
    return ordenDesc(filas, orden[0] ? orden[0][0] : 'fecha_publicacion');
  });
}

const FIXTURE_A = pubMock({ id: 1, publicado: true, fecha_publicacion: new Date(T), fecha_expiracion: new Date(T.getTime() + 2 * DIA) });
const FIXTURE_B = pubMock({ id: 2, publicado: false, fecha_publicacion: new Date(T.getTime() - DIA), fecha_expiracion: null });
const FIXTURE_C = pubMock({ id: 3, publicado: true, fecha_publicacion: new Date(T.getTime() - DIA), fecha_expiracion: null });
const FIXTURES = [FIXTURE_A, FIXTURE_B, FIXTURE_C];

let dateSpy;

function fijarAhora(fecha) {
  if (dateSpy) dateSpy.mockRestore();
  const RealDate = Date;
  const fija = new Date(fecha);
  dateSpy = jest.spyOn(global, 'Date').mockImplementation(function (...args) {
    return args.length ? new RealDate(...args) : new RealDate(fija.getTime());
  });
  Date.now = () => fija.getTime();
  Date.parse = RealDate.parse;
  Date.UTC = RealDate.UTC;
}

beforeEach(() => {
  jest.clearAllMocks();
  if (dateSpy) { dateSpy.mockRestore(); dateSpy = null; }
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Role.findById.mockResolvedValue({ id: 1, nombre: 'Administrador' });
});

afterAll(() => {
  if (dateSpy) dateSpy.mockRestore();
});

describe('vigencia en el tiempo — GET /api/v1/public/publicaciones', () => {
  async function idsEn(fecha) {
    fijarAhora(fecha);
    const res = await request(buildAppPublic()).get('/api/v1/public/publicaciones');
    expect(res.status).toBe(200);
    return res.body.data.map(function (p) { return p.id; });
  }

  beforeEach(() => {
    mockearFindAllReal(FIXTURES);
  });

  it('antes de fecha_publicacion (T-1h): (a) no aparece; (c) sin expiración sí; (b) nunca', async () => {
    const ids = await idsEn(new Date(T.getTime() - 60 * 60 * 1000));
    expect(ids).not.toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it('en T exacto (borde inclusivo de fecha_publicacion): (a) aparece', async () => {
    const ids = await idsEn(T);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it('en T+1d: (a) sigue vigente', async () => {
    const ids = await idsEn(new Date(T.getTime() + DIA));
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it('en T+2d exacto (borde exclusivo de fecha_expiracion): (a) ya no aparece; (c) sigue', async () => {
    const ids = await idsEn(new Date(T.getTime() + 2 * DIA));
    expect(ids).not.toContain(1);
    expect(ids).toContain(3);
  });

  it('después de T+2d: (a) expirada; (c) sin expiración sigue vigente', async () => {
    const ids = await idsEn(new Date(T.getTime() + 30 * DIA));
    expect(ids).not.toContain(1);
    expect(ids).toContain(3);
  });

  it('el modelo recibe order fecha_publicacion DESC y la respuesta respeta ese orden', async () => {
    await idsEn(T);
    expect(Publicacion.findAll).toHaveBeenCalledWith(expect.objectContaining({
      order: [['fecha_publicacion', 'DESC']]
    }));
  });
});

describe('XSS — POST /api/v1/web/publicaciones y reflejo en GET público', () => {
  const PROHIBIDO = /<script|onerror|onload|onclick|onmouseover|javascript:|data:|<iframe|<svg|style=/i;

  let store;

  beforeEach(() => {
    store = [];
    Publicacion.create.mockImplementation(async (campos) => {
      const p = pubMock(Object.assign({ id: store.length + 100 }, campos));
      store.push(p.get());
      return p;
    });
    mockearFindAllReal(store);
  });

  const CASOS = [
    ['script', '<p>hola</p><script>alert(1)</script>', 'hola'],
    ['img onerror', '<img src=x onerror=alert(1)>ok', 'ok'],
    ['a javascript:', '<a href="javascript:alert(1)">x</a>', 'x'],
    ['a JaVaScRiPt:', '<a href="JaVaScRiPt:alert(1)">x</a>', 'x'],
    ['iframe', '<p>ok</p><iframe src=//evil></iframe>', 'ok'],
    ['svg onload', '<svg onload=alert(1)></svg>ok', 'ok'],
    ['p style + onclick', '<p style="x" onclick="y">ok</p>', 'ok'],
    ['a data:', '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>', 'x']
  ];

  CASOS.forEach(function ([nombre, cuerpoMalicioso, textoLegitimo]) {
    it('cuerpo ' + nombre + ': se guarda y responde sanitizado, conservando el texto legítimo', async () => {
      const res = await request(buildAppAdmin())
        .post('/api/v1/web/publicaciones')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ titulo: 'Aviso', cuerpo: cuerpoMalicioso, fecha_publicacion: '2026-06-01T00:00:00Z' });

      // Todos los casos tienen texto legítimo: un 400 significaría que la sanitización vació el cuerpo.
      expect(res.status).toBe(201);
      const guardado = Publicacion.create.mock.calls[0][0].cuerpo;
      expect(guardado).not.toMatch(PROHIBIDO);
      expect(res.body.data.cuerpo).not.toMatch(PROHIBIDO);
      expect(guardado).toContain(textoLegitimo);
    });
  });

  it('título con tag y atributo de evento: queda texto plano', async () => {
    const res = await request(buildAppAdmin())
      .post('/api/v1/web/publicaciones')
      .set('x-access-token', TOKEN_ADMIN)
      .send({ titulo: '<b onmouseover=alert(1)>T</b>', cuerpo: '<p>ok</p>', fecha_publicacion: '2026-06-01T00:00:00Z' });
    expect(res.status).toBe(201);
    const guardado = Publicacion.create.mock.calls[0][0].titulo;
    expect(guardado).toBe('T');
    expect(res.body.data.titulo).toBe('T');
  });

  it('GET público devuelve el cuerpo ya sanitizado tal como quedó guardado', async () => {
    await request(buildAppAdmin())
      .post('/api/v1/web/publicaciones')
      .set('x-access-token', TOKEN_ADMIN)
      .send({
        titulo: 'Aviso', cuerpo: '<p>ok</p><script>alert(1)</script>',
        fecha_publicacion: new Date(T.getTime() - DIA).toISOString(), publicado: true
      });
    expect(store.length).toBe(1);

    fijarAhora(T);
    const res = await request(buildAppPublic()).get('/api/v1/public/publicaciones');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].cuerpo).toBe(store[0].cuerpo);
    expect(res.body.data[0].cuerpo).not.toMatch(PROHIBIDO);
  });
});
