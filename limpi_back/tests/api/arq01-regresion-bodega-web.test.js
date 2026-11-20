/**
 * RNF-ARQ-01 parte 1 (SCRUM-42) — Regresión legacy vs /api/v1 para productos, stock rápido y contacto.
 * Ambos routers (legacy sin tocar y v1) se montan en la misma app y leen los MISMOS mockDatos simulados: para cada caso
 * equivalente se compara lo devuelto y el efecto (update/create/increment/auditoría). Las diferencias intencionales
 * están documentadas en Docs/MIGRACION_RUTAS.md y se prueban como tales.
 */
const { Op } = require('sequelize');

const mockDatos = { productos: [], stock: [], creados: [], updates: [], increments: [] };

// Evaluador mínimo del `where` de Sequelize usado por ambos lados (igualdad, in, ne, gt, like, or).
function mockCumple(fila, where) {
  if (!where) return true;
  const ors = where[Op.or];
  if (ors && !ors.some((w) => mockCumple(fila, w))) return false;
  return Object.keys(where).every((k) => {
    const cond = where[k];
    const v = fila[k];
    if (cond === null || typeof cond !== 'object') return v === cond || String(v) === String(cond);
    if (cond[Op.in]) return cond[Op.in].map(String).indexOf(String(v)) !== -1;
    if (Op.ne in cond) return String(v) !== String(cond[Op.ne]);
    if (Op.gt in cond) return Number(v) > cond[Op.gt];
    if (Op.like in cond) return String(v).toLowerCase().indexOf(cond[Op.like].replace(/%/g, '').toLowerCase()) !== -1;
    return false;
  });
}
const mockOrdenar = (filas, order) => (order && order[0] && order[0][0] === 'id' && order[0][1] === 'DESC' ? filas.slice().sort((a, b) => b.id - a.id) : filas.slice().sort((a, b) => a.id - b.id));
const mockInstancia = (fila) => Object.assign({}, fila, {
  get: () => Object.assign({}, fila),
  update: jest.fn(async (cambios) => { mockDatos.updates.push({ id: fila.id, cambios: cambios }); Object.assign(fila, cambios); })
});

jest.mock('../../database/database', () => ({
  sequelize: {
    define: jest.fn(() => { const m = {}; ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'].forEach((x) => { m[x] = jest.fn(); }); return m; }),
    transaction: jest.fn(async (a, b) => (typeof a === 'function' ? a : b)({ LOCK: { UPDATE: 'UPDATE' } }))
  }
}));
jest.mock('../../services/caja/cierre', () => ({ reintentarTransaccion: jest.fn((fn) => fn()) }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));
jest.mock('../../modelos/sistema_base/Producto', () => ({
  belongsTo: jest.fn(),
  findAll: jest.fn(async (o) => mockOrdenar(mockDatos.productos.filter((p) => mockCumple(p, o && o.where)), o && o.order).map((p) => Object.assign({}, p))),
  findOne: jest.fn(async (o) => { const p = mockDatos.productos.find((x) => mockCumple(x, o.where)); return p ? mockInstancia(p) : null; }),
  findById: jest.fn(async (id) => { const p = mockDatos.productos.find((x) => String(x.id) === String(id)); return p ? mockInstancia(p) : null; }),
  create: jest.fn(async (d) => { const p = Object.assign({ id: 100 + mockDatos.creados.length }, d); mockDatos.creados.push({ tabla: 'productos', mockDatos: d }); mockDatos.productos.push(p); return mockInstancia(p); }),
  update: jest.fn(async (cambios, o) => { mockDatos.updates.push({ id: Number(o.where.id), cambios: cambios }); return [1]; }),
  increment: jest.fn(async (campo, o) => { mockDatos.increments.push({ id: o.where.id, by: o.by }); const p = mockDatos.productos.find((x) => x.id === o.where.id); p.stock += o.by; })
}));
jest.mock('../../modelos/sistema_base/Stock_rapido', () => ({
  belongsTo: jest.fn(),
  findAll: jest.fn(async () => mockDatos.stock.slice().sort((a, b) => b.id - a.id).map((s) => Object.assign({}, s))),
  create: jest.fn(async (d) => { mockDatos.creados.push({ tabla: 'stock_rapidos', mockDatos: d }); return Object.assign({ id: 500 + mockDatos.creados.length }, d); })
}));
const mockCorreos = [];
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: jest.fn((m, cb) => { mockCorreos.push(m); if (cb) cb(null, { ok: true }); return Promise.resolve({ ok: true }); }) }) }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn(() => ({ id: 1, correo: 'a@a.cl', roleId: 1 })), sign: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async () => ({ id: 1, nombre: 'Administrador' })) }));

const express = require('express');
const request = require('supertest');
const { auditar } = require('../../services/auditoria');
const { manejadorErrores } = require('../../middleware/errores');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/producto', require('../../api/apartado_base/producto/routes'));
  a.use('/stock', require('../../api/apartado_base/stock_rapido/routes'));
  a.use('/contactanos_web', require('../../routes/sistema_web/Contactanos'));
  a.use('/api/v1/bodega', require('../../api/v1/bodega/routes'));
  a.use('/api/v1/public', require('../../api/v1/public/routes'));
  a.use(manejadorErrores);
  return a;
}
const v1 = (metodo, ruta) => request(app())[metodo]('/api/v1' + ruta).set('x-access-token', 'token-admin');

const ENV = Object.assign({}, process.env);
beforeEach(() => {
  jest.clearAllMocks();
  mockCorreos.length = 0;
  Object.assign(mockDatos, {
    productos: [
      { id: 1, nombre: 'Cloro 5L', descripcion: null, tipo: 1, estado: 1, stock: 0, precio: 4500, stock_minimo: 0, proveedor_id: null, costo_unitario: null },
      { id: 2, nombre: 'Bolsas basura', descripcion: 'x10', tipo: 1, estado: 0, stock: 3, precio: 1200, stock_minimo: 0, proveedor_id: null, costo_unitario: null },
      { id: 3, nombre: 'Guantes', descripcion: null, tipo: 2, estado: 1, stock: 40, precio: 990, stock_minimo: 5, proveedor_id: null, costo_unitario: null },
      { id: 4, nombre: 'Cloro gel', descripcion: null, tipo: 1, estado: 2, stock: 9, precio: 3000, stock_minimo: 0, proveedor_id: null, costo_unitario: null }
    ],
    stock: [{ id: 7, cantidad: 5, comentario: 'compra', fecha: '2026-11-10T12:00:00.000Z', productoId: 3 }, { id: 8, cantidad: 2, comentario: null, fecha: '2026-11-11T12:00:00.000Z', productoId: 1 }],
    creados: [], updates: [], increments: []
  });
});
afterAll(() => { process.env = ENV; });

describe('productos: listados (mismos mockDatos, mismo resultado)', () => {
  [
    ['/producto/activo', 'productos', '/bodega/productos'],
    ['/producto/activo', 'productos', '/bodega/productos?estado=activo'],
    ['/producto/inactivo', 'productosInactivos', '/bodega/productos?estado=inactivo'],
    ['/producto/stock_activo', 'productos', '/bodega/productos?con_stock=1'],
    ['/producto/busca-activo/cloro', 'productos', '/bodega/productos?busca=cloro'],
    ['/producto/busca-activo/990', 'productos', '/bodega/productos?busca=990'],
    ['/producto/busca-inactivo/bolsa', 'productosInactivos', '/bodega/productos?estado=inactivo&busca=bolsa'],
    ['/producto/busca-activo', 'productos', '/bodega/productos?busca=']
  ].forEach(([legacy, clave, nueva]) => {
    it(legacy + ' ≡ GET /api/v1' + nueva, async () => {
      const a = await request(app()).get(legacy);
      const b = await v1('get', nueva);
      expect(b.status).toBe(200);
      expect(b.body.data).toEqual(a.body[clave]);
      expect(b.body.data.length).toBeGreaterThan(0);
    });
  });

  it('diferencia documentada: /producto/todos hoy falla en legacy; v1 estado=todos devuelve activos + inactivos (sin borrados)', async () => {
    const a = await request(app()).get('/producto/todos');
    expect(a.text).toMatch(/^error/);
    const b = await v1('get', '/bodega/productos?estado=todos');
    expect(b.body.data.map((p) => p.id)).toEqual([3, 2, 1]);
  });
});

describe('productos: escrituras (mismo efecto)', () => {
  const nuevo = { nombre: 'Escoba', descripcion: 'roja', tipo: 1, stock: 4, precio: 2500 };

  it('crear: mismos mockDatos guardados (v1 siempre activo) y nombre repetido rechazado en ambos', async () => {
    await request(app()).post('/producto/crear').send({ producto: JSON.stringify(Object.assign({ estado: 1 }, nuevo)) });
    await v1('post', '/bodega/productos').send(Object.assign({}, nuevo, { nombre: 'Escoba 2' }));
    const [l, n] = mockDatos.creados.map((c) => c.mockDatos);
    expect(n).toEqual(Object.assign({}, l, { nombre: 'Escoba 2' }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'productos', accion: 'CREAR' }));

    const a = await request(app()).post('/producto/crear').send({ producto: JSON.stringify({ nombre: 'Guantes' }) });
    expect(a.body.mensaje).toMatch(/ya esta registrado/);
    const b = await v1('post', '/bodega/productos').send({ nombre: 'Guantes' });
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe('PRODUCTO_DUPLICADO');
    // El nombre de un producto borrado (estado 2) queda libre en ambos.
    expect((await v1('post', '/bodega/productos').send({ nombre: 'Cloro gel' })).status).toBe(201);
  });

  it('editar: mismos campos (sin stock/estado en v1) y mismo chequeo de nombre repetido', async () => {
    const cambios = { nombre: 'Guantes nitrilo', descripcion: 'talla M', tipo: 2, precio: 1100 };
    await request(app()).put('/producto/editar/3').send({ producto: JSON.stringify(Object.assign({ estado: 1, stock: 40 }, cambios)) });
    await v1('put', '/bodega/productos/1').send(cambios);
    const [l, n] = mockDatos.updates.map((u) => u.cambios);
    expect(n).toEqual(cambios);
    expect(l).toEqual(Object.assign({ estado: 1, stock: 40 }, cambios));
    expect((await v1('put', '/bodega/productos/3').send({ nombre: 'Bolsas basura' })).status).toBe(409);
    expect((await v1('put', '/bodega/productos/3').send({ stock: 1 })).body.error.code).toBe('CAMPO_NO_EDITABLE');
    expect((await v1('put', '/bodega/productos/3').send({})).body.error.code).toBe('SIN_CAMBIOS');
  });

  [['/producto/eliminar/1', 'inactivo', 0], ['/producto/activar/2', 'activo', 1]].forEach(([legacy, estado, valor]) => {
    it('DELETE ' + legacy + ' ≡ PATCH /productos/:id/estado ' + estado, async () => {
      await request(app()).delete(legacy);
      const id = Number(legacy.split('/').pop());
      await v1('patch', '/bodega/productos/' + id + '/estado').send({ estado: estado });
      expect(mockDatos.updates).toEqual([{ id: id, cambios: { estado: valor } }, { id: id, cambios: { estado: valor } }]);
    });
  });

  it('DELETE /producto/borrar/:id ≡ DELETE /productos/:id: borrado lógico (estado 2), no se elimina la fila', async () => {
    await request(app()).delete('/producto/borrar/3');
    await v1('delete', '/bodega/productos/1');
    expect(mockDatos.updates.map((u) => u.cambios)).toEqual([{ estado: 2 }, { estado: 2 }]);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'productos', accion: 'ANULAR' }));
    expect((await v1('delete', '/bodega/productos/4')).status).toBe(404); // ya borrado
  });
});

describe('stock rápido', () => {
  it('GET /stock/obtener ≡ GET /bodega/stock-rapido (mismas filas, mismo orden)', async () => {
    const b = await v1('get', '/bodega/stock-rapido');
    expect(b.body.data.map((s) => [s.id, s.producto_id, s.cantidad])).toEqual([[8, 1, 2], [7, 3, 5]]);
    expect(b.body.data[0].producto).toBe('Cloro 5L');
    const a = await request(app()).get('/stock/obtener');
    expect(a.body.stocks.map((s) => [s.id, s.productoId, s.cantidad])).toEqual([[8, 1, 2], [7, 3, 5]]);
  });

  it('POST /stock/crear ≡ POST /bodega/stock-rapido: misma fila, mismo incremento y mismas auditorías', async () => {
    await request(app()).post('/stock/crear').send({ stocks: JSON.stringify([{ productoId: 3, cantidad: 6, comentario: 'compra', fecha: '2026-11-20T12:00:00Z' }]) });
    const legacy = { creados: mockDatos.creados.splice(0), increments: mockDatos.increments.splice(0), audit: auditar.mock.calls.map((c) => [c[0].entidad, c[0].accion]) };
    auditar.mockClear();
    const res = await v1('post', '/bodega/stock-rapido').send({ items: [{ producto_id: 3, cantidad: 6, comentario: 'compra', fecha: '2026-11-20' }] });
    expect(res.status).toBe(201);
    expect(mockDatos.creados).toEqual(legacy.creados);
    expect(mockDatos.increments).toEqual(legacy.increments);
    expect(auditar.mock.calls.map((c) => [c[0].entidad, c[0].accion])).toEqual(legacy.audit);
    expect(res.body.data.productos).toEqual([{ id: 3, nombre: 'Guantes', stock: 52 }]);
  });

  it('v1 valida la entrada y rechaza productos no activos (todo o nada)', async () => {
    expect((await v1('post', '/bodega/stock-rapido').send({ items: [] })).status).toBe(400);
    expect((await v1('post', '/bodega/stock-rapido').send({ items: [{ producto_id: 3, cantidad: 0 }] })).body.error.details).toEqual({ 'items.0.cantidad': 'entero mayor a 0' });
    const r = await v1('post', '/bodega/stock-rapido').send({ items: [{ producto_id: 3, cantidad: 1 }, { producto_id: 2, cantidad: 1 }] });
    expect(r.status).toBe(409);
    expect(r.body.error.details.producto_ids).toEqual([2]);
    expect(mockDatos.increments).toEqual([]);
  });
});

describe('contacto', () => {
  const form = { nombre: 'Ana <b>Pérez</b>', email: 'ana@correo.cl', celular: '+56 9 1234 5678', mensaje: 'Hola\n<script>x</script>' };

  it('POST /contactanos_web/contactanos ≡ POST /public/contacto: mismo destino y asunto; v1 escapa el HTML', async () => {
    process.env.SMTP_HOST = 'smtp.test'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASS = 'p';
    await request(app()).post('/contactanos_web/contactanos').send(form);
    const res = await request(app()).post('/api/v1/public/contacto').send(form);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { enviado: true }, meta: {} });
    const [l, n] = mockCorreos;
    expect([n.to, n.subject, n.from]).toEqual([l.to, l.subject, l.from]);
    expect(l.html).toContain('<script>');
    expect(n.html).not.toContain('<script>');
    expect(n.html).toContain('Ana &lt;b&gt;Pérez&lt;/b&gt;');
    expect(n.replyTo).toBe('ana@correo.cl');
  });

  it('v1 valida campos y no envía nada si faltan', async () => {
    const r = await request(app()).post('/api/v1/public/contacto').send({ nombre: 'x', email: 'malo' });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.error.details).sort()).toEqual(['email', 'mensaje']);
    expect(mockCorreos).toEqual([]);
  });

  it('sin SMTP configurado responde 503 en vez de colgar la petición', async () => {
    delete process.env.SMTP_HOST;
    const r = await request(app()).post('/api/v1/public/contacto').send({ nombre: 'Ana', email: 'ana@correo.cl', mensaje: 'Hola' });
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('CORREO_NO_CONFIGURADO');
  });
});

describe('permisos de las rutas v1 de bodega', () => {
  const jwt = require('jsonwebtoken');
  const Role = require('../../modelos/sistema_base/Role');
  const RUTAS = [['get', '/bodega/productos'], ['post', '/bodega/productos'], ['put', '/bodega/productos/1'], ['patch', '/bodega/productos/1/estado'],
    ['delete', '/bodega/productos/1'], ['get', '/bodega/stock-rapido'], ['post', '/bodega/stock-rapido']];

  it('sin token: 401 y sin efectos', async () => {
    jwt.verify.mockImplementation(() => { const e = new Error('x'); e.name = 'JsonWebTokenError'; throw e; });
    for (const [m, r] of RUTAS) expect((await request(app())[m]('/api/v1' + r)).status).toBe(401);
    expect(mockDatos.updates.concat(mockDatos.creados)).toEqual([]);
  });

  it('RRHH: 403; Operaciones: pasa', async () => {
    jwt.verify.mockImplementation(() => ({ id: 5, correo: 'r@r.cl', roleId: 2 }));
    Role.findById.mockImplementation(async () => ({ id: 2, nombre: 'RRHH' }));
    for (const [m, r] of RUTAS) expect((await v1(m, r)).status).toBe(403);
    Role.findById.mockImplementation(async () => ({ id: 3, nombre: 'Operaciones' }));
    expect((await v1('get', '/bodega/productos')).status).toBe(200);
  });
});
