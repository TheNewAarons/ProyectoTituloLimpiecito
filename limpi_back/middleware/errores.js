// RNF-API-02: manejo centralizado de errores. Respuesta: { error: true, message, code }.

// Express 4 no captura promesas rechazadas: envuelve los handlers async de los endpoints nuevos.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res, next)).catch(next);
};

// Debe registrarse después de todas las rutas.
const manejadorErrores = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const estado = err.status || err.statusCode || 500;
  const interno = estado >= 500;
  const produccion = process.env.NODE_ENV === 'production';

  // El stack completo queda solo en el log del servidor (no se registra el body: puede traer claves).
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err && err.stack ? err.stack : err);

  const cuerpo = {
    error: true,
    message: interno && produccion ? 'Error interno del servidor' : (err && err.message) || 'Error',
    code: interno ? 'INTERNAL_ERROR' : err.code || 'BAD_REQUEST',
  };
  if (!produccion) cuerpo.stack = err && err.stack;

  return res.status(estado).json(cuerpo);
};

module.exports = { asyncHandler, manejadorErrores };
