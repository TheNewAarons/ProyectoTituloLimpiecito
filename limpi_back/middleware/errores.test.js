// Ejecutar: node --test middleware/errores.test.js   (node:test, sin dependencias)
const test = require('node:test');
const assert = require('node:assert');
const { asyncHandler, manejadorErrores } = require('./errores');

const req = { method: 'GET', originalUrl: '/web-limpiecito/api/v1/x' };
const resFalso = () => {
  const r = { headersSent: false };
  r.status = (c) => ((r.codigo = c), r);
  r.json = (b) => ((r.cuerpo = b), r);
  return r;
};
// El middleware registra el stack con console.error: se silencia y se captura para comprobarlo.
const conLog = (fn) => {
  const orig = console.error;
  const lineas = [];
  console.error = (...a) => lineas.push(a.join(' '));
  try { fn(); } finally { console.error = orig; }
  return lineas;
};
const conEntorno = (valor, fn) => {
  const previo = process.env.NODE_ENV;
  process.env.NODE_ENV = valor;
  try { return fn(); } finally { previo === undefined ? delete process.env.NODE_ENV : (process.env.NODE_ENV = previo); }
};

test('producción: 500 sin stack ni detalles internos, pero el stack va al log', () => {
  const res = resFalso();
  const err = new Error('ER_ACCESS_DENIED usuario@host');
  const log = conEntorno('production', () => conLog(() => manejadorErrores(err, req, res, () => {})));
  assert.strictEqual(res.codigo, 500);
  assert.deepStrictEqual(res.cuerpo, { error: true, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  assert.ok(log.join('\n').includes('ER_ACCESS_DENIED') && log.join('\n').includes('errores.test.js'), 'el log debe tener el stack completo');
});

test('desarrollo: 500 muestra message y stack', () => {
  const res = resFalso();
  conEntorno('development', () => conLog(() => manejadorErrores(new Error('boom'), req, res, () => {})));
  assert.strictEqual(res.cuerpo.message, 'boom');
  assert.ok(res.cuerpo.stack);
});

test('4xx conserva estado y mensaje, también en producción', () => {
  const res = resFalso();
  const err = Object.assign(new Error('JSON mal formado'), { status: 400 });
  conEntorno('production', () => conLog(() => manejadorErrores(err, req, res, () => {})));
  assert.strictEqual(res.codigo, 400);
  assert.deepStrictEqual(res.cuerpo, { error: true, message: 'JSON mal formado', code: 'BAD_REQUEST' });
});

test('si la respuesta ya se envió, delega en next', () => {
  const res = resFalso();
  res.headersSent = true;
  let recibido;
  manejadorErrores(new Error('x'), req, res, (e) => (recibido = e));
  assert.ok(recibido);
  assert.strictEqual(res.codigo, undefined);
});

test('asyncHandler: promesa rechazada y throw síncrono llegan a next', async () => {
  const errores = [];
  const next = (e) => errores.push(e.message);
  await asyncHandler(async () => { throw new Error('async'); })(req, {}, next);
  await asyncHandler(() => { throw new Error('sync'); })(req, {}, next);
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(errores.sort(), ['async', 'sync']);
});

test('asyncHandler: sin error no llama a next', async () => {
  let llamado = false;
  const s = {};
  asyncHandler(async (q, res) => { res.ok = true; })(req, s, () => (llamado = true));
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(s.ok, true);
  assert.strictEqual(llamado, false);
});
