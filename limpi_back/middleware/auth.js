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
const Usuario = require('../modelos/sistema_base/Usuario');

// Mismo contexto que usa services/auditoria para usuarios de la tabla `usuarios` (intranet/admin).
const CONTEXTO_USUARIOS = 'usuarios';

/**
 * Decodifica un `x-access-token` con `process.env.SECRET_KEY` (igual que el login existente) y
 * resuelve el rol del usuario, devolviendo el shape exacto de `req.usuario`. Devuelve null si el
 * payload no trae `id`; jwt.verify puede lanzar JsonWebTokenError/TokenExpiredError (síncronos)
 * que el llamador decide cómo tratar.
 * @param {string} token
 * @returns {Promise<object|null>} { id, nombre, correo, roleId, rol_nombre, contexto } o null
 */
async function resolverUsuarioDesdeToken(token) {
  const payload = jwt.verify(token, process.env.SECRET_KEY);
  if (!payload || !payload.id) return null;

  const rol = payload.roleId ? await Role.findById(payload.roleId) : null;

  // Solo los campos necesarios: nunca el password/hash que trae el payload original.
  return {
    id: payload.id,
    nombre: payload.nombre,
    correo: payload.correo,
    roleId: payload.roleId || null,
    rol_nombre: rol ? rol.nombre : null,
    contexto: CONTEXTO_USUARIOS
  };
}

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
  const usuario = await resolverUsuarioDesdeToken(token);
  if (!usuario) {
    throw new AppError('TOKEN_INVALID', 'token invalido', 401);
  }

  req.usuario = usuario;
  next();
});

/**
 * D-074: identificación opcional para rutas legacy. Decodifica `x-access-token` si viene y es
 * válido (mismo req.usuario que `autenticar`); ante token ausente, inválido, expirado o fallo al
 * cargar el rol, continúa SIN req.usuario y SIN responder error (nunca rechaza).
 * Además exige payload.roleId y confirma contra `usuarios` que el id existe y que su correo
 * coincide con el del payload, para no atribuir a un Admin falso tokens de otros contextos
 * firmados con el mismo SECRET_KEY. Si la BD cae, continúa sin usuario.
 */
const identificarOpcional = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    if (!payload || !payload.id || !payload.roleId) return next();
    const usuarioBd = await Usuario.findById(payload.id);
    if (!usuarioBd || usuarioBd.correo !== payload.correo) return next();
    const usuario = await resolverUsuarioDesdeToken(token);
    if (usuario) req.usuario = usuario;
  } catch (e) {
    // token inválido/expirado, rol no cargable o BD caída: continuar sin usuario, sin propagar.
  }
  return next();
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
  identificarOpcional: identificarOpcional,
  requerirRol: requerirRol
};
