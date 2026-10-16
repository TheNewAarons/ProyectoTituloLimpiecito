// Ejecutar: node --test middleware/errores.test.js   (node:test, sin dependencias)
const test = require('node:test');
const assert = require('node:assert');
const { AppError, asyncHandler, noEncontrado, manejadorErrores } = require('./errores');

const req = { method: 'GET', originalUrl: '/web-limpiecito/api/v1/x?token=SECRETO', body: { password: 'CLAVE-EN-BODY' } };
const resFalso = () => {
  const r = { headersSent: false };
  r.status = (c) => ((r.codigo = c), r);
  r.json = (b) => ((r.cuerpo = b), r);
  return r;
};
// El middleware registra con console.error: se silencia y se captura para comprobar qué se loguea.
const manejar = (err, entorno = 'production', rq = req) => {
  const res = resFalso();
  const previo = process.env.NODE_ENV;
  const orig = console.error;
  const lineas = [];
  process.env.NODE_ENV = entorno;
  console.error = (...a) => lineas.push(a.join(' '));
  try { manejadorErrores(err, rq, res, () => {}); } finally {
    console.error = orig;
    previo === undefined ? delete process.env.NODE_ENV : (process.env.NODE_ENV = previo);
  }
  return { res, log: lineas.join('\n') };
};
const nombrado = (nombre, extra) => Object.assign(new Error(nombre), { name: nombre }, extra);

test('AppError: usa su code, message, estado y details', () => {
  const { res } = manejar(new AppError('STOCK_INSUFICIENTE', 'No alcanza el stock', 409, { producto_id: 4 }));
  assert.strictEqual(res.codigo, 409);
  assert.deepStrictEqual(res.cuerpo, { ok: false, error: { code: 'STOCK_INSUFICIENTE', message: 'No alcanza el stock', details: { producto_id: 4 } } });
});

test('validación de Sequelize -> 400 con campos y sin valores', () => {
  const err = nombrado('SequelizeValidationError', { errors: [{ path: 'email', message: 'email inválido', value: 'a@b' }] });
  const { res } = manejar(err);
  assert.strictEqual(res.codigo, 400);
  assert.strictEqual(res.cuerpo.error.code, 'VALIDATION_ERROR');
  assert.deepStrictEqual(res.cuerpo.error.details, { campos: [{ campo: 'email', mensaje: 'email inválido' }] });
});

test('SequelizeUniqueConstraintError -> 409; no filtra el valor duplicado ni en respuesta ni en log', () => {
  const err = nombrado('SequelizeUniqueConstraintError', { message: "Duplicate entry 'dueno@correo.cl'", fields: { email: 'dueno@correo.cl' }, errors: [] });
  const { res, log } = manejar(err);
  assert.strictEqual(res.codigo, 409);
  assert.strictEqual(res.cuerpo.error.code, 'DUPLICATE');
  assert.deepStrictEqual(res.cuerpo.error.details, { campos: ['email'] });
  assert.ok(!JSON.stringify(res.cuerpo).includes('dueno@correo.cl'));
  assert.ok(!log.includes('dueno@correo.cl'));
});

test('JWT expirado e inválido -> 401', () => {
  const exp = manejar(nombrado('TokenExpiredError', { message: 'jwt expired' }));
  const inv = manejar(nombrado('JsonWebTokenError', { message: 'invalid signature' }));
  assert.deepStrictEqual([exp.res.codigo, exp.res.cuerpo.error.code], [401, 'TOKEN_EXPIRED']);
  assert.deepStrictEqual([inv.res.codigo, inv.res.cuerpo.error.code], [401, 'TOKEN_INVALID']);
  assert.ok(!JSON.stringify(inv.res.cuerpo).includes('invalid signature'));
});

test('no encontrado -> 404 NOT_FOUND', () => {
  const { res } = manejar(Object.assign(new Error('Not Found'), { status: 404 }));
  assert.deepStrictEqual([res.codigo, res.cuerpo.error.code], [404, 'NOT_FOUND']);
});

test('4xx genérico (p. ej. JSON mal formado) conserva estado y mensaje en producción', () => {
  const { res } = manejar(Object.assign(new Error('JSON mal formado'), { status: 400, code: 'ALGO_INTERNO' }));
  assert.deepStrictEqual(res.cuerpo, { ok: false, error: { code: 'BAD_REQUEST', message: 'JSON mal formado' } });
});

test('producción: el resto es 500 sin stack ni detalles internos', () => {
  const { res } = manejar(new Error('ER_ACCESS_DENIED usuario@host'));
  assert.strictEqual(res.codigo, 500);
  assert.deepStrictEqual(res.cuerpo, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
});

test('desarrollo: 500 muestra message y stack dentro de error', () => {
  const { res } = manejar(new Error('boom'), 'development');
  assert.strictEqual(res.cuerpo.error.message, 'boom');
  assert.ok(res.cuerpo.error.stack);
});

test('log: timestamp, método, ruta sin query, usuario y stack; nunca el body ni el query', () => {
  const { log } = manejar(new Error('fallo'), 'production', { ...req, usuario: { id: 7 } });
  assert.match(log, /^\[\d{4}-\d\d-\d\dT[\d:.]+Z\] GET \/web-limpiecito\/api\/v1\/x usuario=7 500 INTERNAL_ERROR/);
  assert.ok(log.includes('errores.test.js'), 'debe incluir el stack completo');
  assert.ok(!log.includes('CLAVE-EN-BODY') && !log.includes('SECRETO'));
  assert.match(manejar(new Error('x')).log, /usuario=anonimo/);
});

test('si la respuesta ya se envió, delega en next', () => {
  const res = resFalso();
  res.headersSent = true;
  let recibido;
  manejadorErrores(new Error('x'), req, res, (e) => (recibido = e));
  assert.ok(recibido);
  assert.strictEqual(res.codigo, undefined);
});

test('noEncontrado entrega un AppError 404', () => {
  let err;
  noEncontrado(req, {}, (e) => (err = e));
  assert.ok(err instanceof AppError);
  assert.deepStrictEqual([err.httpStatus, err.code], [404, 'NOT_FOUND']);
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
