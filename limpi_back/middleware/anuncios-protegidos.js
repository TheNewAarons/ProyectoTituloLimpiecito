/**
 * Obs. 24 (AUT-019) — Las rutas legacy /anuncios_web de escritura (crear, editar, eliminar) no exigían sesión.
 * Se monta en index.js ANTES del router legacy: la lectura (GET) sigue libre para la web pública; el resto exige
 * sesión de Administrador. Errores en el formato v1 (middleware central de errores).
 */
const { autenticar, requerirRol } = require('./auth');
const { ROL_ADMIN_NOMBRES } = require('../services/constantes');

const soloAdmin = requerirRol.apply(null, ROL_ADMIN_NOMBRES);

module.exports = function anunciosProtegidos(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  return autenticar(req, res, (err) => (err ? next(err) : soloAdmin(req, res, next)));
};
