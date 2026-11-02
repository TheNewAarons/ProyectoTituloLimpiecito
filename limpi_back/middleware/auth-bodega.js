/**
 * RF-BOD-01 — Autenticación para /api/v1/bodega: acepta dos contextos firmados con la misma SECRET_KEY.
 * - Supervisor: token de POST /acces_laboral/login (payload con `tipo_acceso`; `id` = trabajadores.id).
 *   Solo pasa si tipo_acceso = 1 (Trabajador y Supervisor), el trabajador sigue activo y su acceso laboral
 *   sigue activo con tipo 1 (se revalida en cada request: el token dura 1 día).
 * - Usuario intranet (`usuarios`): delega en middleware/auth.autenticar (de RF-CAJA-02, sin modificarlo) y
 *   además exige que el usuario exista activo (estado = 1) con el mismo correo y roleId del token. autenticar por sí solo acepta
 *   tokens de acceso_clientes/usuario_apps (traen `id` sin roleId): aquí se rechazan con 401.
 * Límite conocido: el token de recuperación de contraseña firma el mismo payload que el login y no se
 * distingue (ver Docs/bodega-solicitudes.md).
 * Nunca se comparan ids entre contextos: req.usuario.contexto dice a qué tabla pertenece req.usuario.id.
 */

const jwt = require('jsonwebtoken');

const AppError = require('../libs/app-error');
const { asyncHandler } = require('./errores');
const { autenticar } = require('./auth');
const Trabajadore = require('../modelos/sistema_base/Trabajadore');
const Usuario = require('../modelos/sistema_base/Usuario');
const AccesoLaboral = require('../modelos/sistema_intranet/acceso_laboral');
const { TIPO_ACCESO_SUPERVISOR } = require('../services/bodega/constantes');

const CONTEXTO_SUPERVISOR = 'acceso_trabajadores';
const CONTEXTO_USUARIO = 'usuarios';
const ALGORITMOS = ['HS256'];

const noAutorizado = () => new AppError('TOKEN_INVALID', 'credenciales no validas', 401);

const supervisor = asyncHandler(async (req, res, next) => {
  const payload = req.tokenBodega;
  delete req.tokenBodega; // trae rut y otros datos personales: no se deja en req
  if (Number(payload.tipo_acceso) !== TIPO_ACCESO_SUPERVISOR) {
    throw new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403);
  }
  const id = Number(payload.id);
  const trabajador = Number.isInteger(id) && id > 0
    ? await Trabajadore.findById(id, { attributes: ['id', 'nombre', 'apellido', 'estado'] })
    : null;
  // Mismo mensaje si no existe o está inactivo: no revela cuál de los dos casos es.
  if (!trabajador || Number(trabajador.estado) !== 1) throw noAutorizado();
  // El token dura 1 día: se revalida que el acceso laboral siga activo y siga siendo de supervisor.
  const acceso = await AccesoLaboral.findOne({ where: { trabajadoreId: trabajador.id, estado: 1, tipo: TIPO_ACCESO_SUPERVISOR }, attributes: ['id'] });
  if (!acceso) throw noAutorizado();
  req.usuario = {
    id: trabajador.id,
    nombre: [trabajador.nombre, trabajador.apellido].filter(Boolean).join(' '),
    rol_nombre: null,
    contexto: CONTEXTO_SUPERVISOR,
    es_supervisor: true
  };
  next();
});

const confirmarUsuario = asyncHandler(async (req, res, next) => {
  const payload = req.tokenBodega;
  const u = await Usuario.findById(req.usuario.id, { attributes: ['id', 'correo', 'roleId', 'estado'] });
  delete req.tokenBodega; // el payload de usuarios trae el hash de password: no se deja en req
  // estado 1 = activo (mismo criterio que el login de usuarios)
  if (!u || Number(u.estado) !== 1 || u.correo !== payload.correo || Number(u.roleId) !== Number(payload.roleId)) throw noAutorizado();
  req.usuario.es_supervisor = false;
  next();
});

function autenticarBodega(req, res, next) {
  const token = req.headers['x-access-token'];
  if (!token) {
    return next(new AppError('TOKEN_REQUERIDO', 'falta el token de autenticacion (x-access-token)', 401));
  }
  try {
    // Lanza JsonWebTokenError/TokenExpiredError -> el middleware central responde 401.
    req.tokenBodega = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ALGORITMOS });
  } catch (err) {
    return next(err);
  }
  if (!req.tokenBodega || typeof req.tokenBodega !== 'object') return next(noAutorizado());
  if (req.tokenBodega.tipo_acceso !== undefined) return supervisor(req, res, next);
  return autenticar(req, res, function (err) {
    if (err) return next(err);
    if (!req.usuario || req.usuario.contexto !== CONTEXTO_USUARIO) return next(noAutorizado());
    return confirmarUsuario(req, res, next);
  });
}

// Qué contextos/roles admite cada ruta (spec §2.3). El supervisor nunca entra por rol.
function permitir(opciones) {
  const roles = (opciones.roles || []).map(function (n) { return String(n).trim().toLowerCase(); });
  return function (req, res, next) {
    const u = req.usuario || {};
    if (u.contexto === CONTEXTO_SUPERVISOR) {
      return opciones.supervisor ? next() : next(new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403));
    }
    const rol = u.contexto === CONTEXTO_USUARIO && u.rol_nombre ? String(u.rol_nombre).trim().toLowerCase() : '';
    if (rol && roles.indexOf(rol) !== -1) return next();
    return next(new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403));
  };
}

module.exports = {
  autenticarBodega: autenticarBodega,
  permitir: permitir,
  CONTEXTO_SUPERVISOR: CONTEXTO_SUPERVISOR,
  CONTEXTO_USUARIO: CONTEXTO_USUARIO
};
