// RNF-API-02: manejo centralizado de errores. Formato (spec 2.6): { ok: false, error: { code, message, details? } }.

// RF-CAJA-02: reexporta libs/app-error.js (la misma clase que usan services/*) en vez de declarar
// una AppError paralela: `err instanceof AppError` no reconocia los errores de services/liquidaciones
// y services/caja, y caian como 500 genericos.
const AppError = require('../libs/app-error');

// Express 4 no captura promesas rechazadas: envuelve los handlers async de los endpoints nuevos.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res, next)).catch(next);
};

// Rutas /api/v1 que ningún router resolvió. Se monta solo bajo /api/v1 para no cambiar el 404 legacy.
const noEncontrado = (req, res, next) => next(new AppError('NOT_FOUND', 'Ruta no encontrada', 404));

const CODIGO_POR_ESTADO = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE' };

// Traduce cualquier error a { estado, code, message, details }. Los 5xx se tratan como internos.
const mapear = (err) => {
  if (err instanceof AppError) return { estado: err.httpStatus, code: err.code, message: err.message, details: err.details };
  // Unique va antes que Validation: en Sequelize v4 es una subclase. Solo se informan los nombres de campo, nunca los valores.
  if (err.name === 'SequelizeUniqueConstraintError') {
    return { estado: 409, code: 'DUPLICATE', message: 'Ya existe un registro con esos datos', details: { campos: Object.keys(err.fields || {}) } };
  }
  if (err.name === 'SequelizeValidationError') {
    return { estado: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: { campos: (err.errors || []).map((e) => ({ campo: e.path, mensaje: e.message })) } };
  }
  if (err.name === 'TokenExpiredError') return { estado: 401, code: 'TOKEN_EXPIRED', message: 'La sesión expiró' };
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') return { estado: 401, code: 'TOKEN_INVALID', message: 'Token inválido' };
  const estado = err.status || err.statusCode || 500;
  if (estado < 500) return { estado, code: CODIGO_POR_ESTADO[estado] || 'BAD_REQUEST', message: err.message };
  return { estado, code: 'INTERNAL_ERROR', message: err.message };
};

// Línea de log sin body ni query string (pueden traer claves). Los errores de Sequelize no se vuelcan completos:
// su mensaje puede incluir el valor duplicado o la consulta.
const registrar = (req, err, m) => {
  const u = req.usuario || req.user;
  const usuario = u && (u.id || u.id_usuario || u.id_acceso) ? (u.id || u.id_usuario || u.id_acceso) : 'anonimo';
  const ruta = String(req.originalUrl || req.url || '').split('?')[0];
  const detalle = /^Sequelize(Unique|Validation)/.test(err.name) ? `${err.name} ${JSON.stringify(m.details)}` : err.stack || err;
  console.error(`[${new Date().toISOString()}] ${req.method} ${ruta} usuario=${usuario} ${m.estado} ${m.code}`, detalle);
};

// Debe registrarse después de todas las rutas.
const manejadorErrores = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  err = err || new Error('Error desconocido');

  const m = mapear(err);
  const produccion = process.env.NODE_ENV === 'production';
  registrar(req, err, m);

  const error = { code: m.code, message: m.estado >= 500 && produccion ? 'Error interno del servidor' : m.message };
  if (m.details !== undefined && (m.estado < 500 || !produccion)) error.details = m.details;
  if (!produccion) error.stack = err.stack;

  return res.status(m.estado).json({ ok: false, error });
};

module.exports = { AppError, asyncHandler, noEncontrado, manejadorErrores };
