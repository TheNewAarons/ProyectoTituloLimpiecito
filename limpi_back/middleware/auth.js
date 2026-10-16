/**
 * RF-CAJA-02 — Autenticación/autorización centralizada para endpoints nuevos bajo /api/v1
 * (TASK_PLAN). Hoy no existe ningún middleware que valide `x-access-token` en las rutas; el
 * login (api/apartado_base/usuario/controlador.js) firma `jwt.sign(usuario.dataValues, ...)`
 * con `process.env.SECRET_KEY`, así que el payload decodificado trae TODAS las columnas de
 * `usuarios` (incluido el hash de `password`): nunca se debe loguear ni devolver tal cual.
 */

const jwt = require('jsonwebtoken');

const AppError = require('../libs/app-error');
const { asyncHandler } = require('./errores');
const Role = require('../modelos/sistema_base/Role');

// Mismo contexto que usa services/auditoria para usuarios de la tabla `usuarios` (intranet/admin).
const CONTEXTO_USUARIOS = 'usuarios';

/**
 * Verifica `x-access-token` con `process.env.SECRET_KEY` (igual que el login existente) y
 * resuelve el rol del usuario. Nunca responde 500 por un token ausente/inválido/expirado: lanza
 * AppError/errores de jsonwebtoken, que el middleware centralizado traduce a 401.
 */
const autenticar = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    throw new AppError('TOKEN_REQUERIDO', 'falta el token de autenticacion (x-access-token)', 401);
  }

  // jwt.verify lanza JsonWebTokenError/TokenExpiredError de forma sincrona; al estar dentro de un
  // async envuelto en asyncHandler, se propaga como rechazo de promesa y llega al middleware
  // centralizado de errores (que ya traduce esos nombres a 401 TOKEN_INVALID/TOKEN_EXPIRED).
  const payload = jwt.verify(token, process.env.SECRET_KEY);
  if (!payload || !payload.id) {
    throw new AppError('TOKEN_INVALID', 'token invalido', 401);
  }

  const rol = payload.roleId ? await Role.findById(payload.roleId) : null;

  // Solo los campos necesarios: nunca el password/hash que trae el payload original.
  req.usuario = {
    id: payload.id,
    nombre: payload.nombre,
    correo: payload.correo,
    roleId: payload.roleId || null,
    rol_nombre: rol ? rol.nombre : null,
    contexto: CONTEXTO_USUARIOS
  };
  next();
});

/**
 * Exige que `req.usuario.rol_nombre` esté entre los nombres de rol permitidos (comparación
 * insensible a mayúsculas/acentos simples). Debe ir después de `autenticar`.
 * @param {...string} nombresPermitidos nombres de `roles.nombre` (ver services/constantes.js)
 */
function requerirRol(...nombresPermitidos) {
  const permitidos = nombresPermitidos.map(function (n) { return String(n).trim().toLowerCase(); });
  return function (req, res, next) {
    const rolActual = req.usuario && req.usuario.rol_nombre ? String(req.usuario.rol_nombre).trim().toLowerCase() : '';
    if (!rolActual || permitidos.indexOf(rolActual) === -1) {
      return next(new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403));
    }
    return next();
  };
}

module.exports = {
  autenticar: autenticar,
  requerirRol: requerirRol
};
