/**
 * RNF-SEC-01 (AUT-006): después de `autenticar`. Deja pasar si quien llama gestiona usuarios (config/roles.js)
 * o si `req.params.id` es su propio id (*Editar perfil*). Si no, 403.
 */
const AppError = require('../libs/app-error');
const { gestionaUsuarios } = require('../config/roles');

const propioOGestor = (req, res, next) => {
  const usuario = req.usuario;
  if (usuario && (gestionaUsuarios(usuario.rol_nombre) || String(usuario.id) === String(req.params.id))) return next();
  return next(new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403));
};

module.exports = { propioOGestor };
