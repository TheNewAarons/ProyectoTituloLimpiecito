/**
 * RF-PEV-02c — Autenticación para las rutas laborales nuevas (/api/v1/pev/trabajador y
 * /api/v1/pev/supervisor). Replica el criterio de middleware/auth-bodega.js#supervisor SIN modificarlo
 * y SIN usar autenticar de auth.js (H-SEC-03): el token de POST /acces_laboral/login firma con
 * SECRET_KEY un payload con `tipo_acceso` y SIN `roleId`; `id` = trabajadores.id.
 * - Tipo 0 = Trabajador General, Tipo 1 = Trabajador y Supervisor (D-133).
 * - Se revalida en cada request que el trabajador siga activo (estado=1) y su acceso laboral siga
 *   activo con el mismo tipo (el token dura 1 día).
 * - Tokens de usuarios/clientes (con roleId o sin tipo_acceso) se rechazan con 401.
 */

const jwt = require('jsonwebtoken');

const AppError = require('../libs/app-error');
const { asyncHandler } = require('./errores');
const Trabajadore = require('../modelos/sistema_base/Trabajadore');
const AccesoLaboral = require('../modelos/sistema_intranet/acceso_laboral');

const CONTEXTO = 'acceso_trabajadores';
const ALGORITMOS = ['HS256'];
const TIPO_TRABAJADOR = 0;
const TIPO_SUPERVISOR = 1;

const noAutorizado = () => new AppError('TOKEN_INVALID', 'credenciales no validas', 401);

const autenticarLaboral = asyncHandler(async (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    throw new AppError('TOKEN_REQUERIDO', 'falta el token de autenticacion (x-access-token)', 401);
  }

  // jwt.verify lanza JsonWebTokenError/TokenExpiredError de forma síncrona; dentro de asyncHandler
  // se propaga como rechazo y el middleware central lo traduce a 401.
  const payload = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ALGORITMOS });
  if (!payload || typeof payload !== 'object') throw noAutorizado();
  // El token laboral trae tipo_acceso y NO roleId; cualquier otro contexto (usuarios/clientes) -> 401.
  if (payload.tipo_acceso === undefined || payload.roleId !== undefined) throw noAutorizado();

  const tipo = Number(payload.tipo_acceso);
  if (tipo !== TIPO_TRABAJADOR && tipo !== TIPO_SUPERVISOR) throw noAutorizado();

  const id = Number(payload.id);
  const trabajador = Number.isInteger(id) && id > 0
    ? await Trabajadore.findById(id, { attributes: ['id', 'nombre', 'apellido', 'n_empleado', 'estado'] })
    : null;
  // Mismo mensaje si no existe o está inactivo: no revela cuál de los dos casos es.
  if (!trabajador || Number(trabajador.estado) !== 1) throw noAutorizado();

  const acceso = await AccesoLaboral.findOne({
    where: { trabajadoreId: trabajador.id, estado: 1, tipo: tipo },
    attributes: ['id']
  });
  if (!acceso) throw noAutorizado();

  req.usuario = {
    id: trabajador.id,
    n_empleado: trabajador.n_empleado === undefined ? null : trabajador.n_empleado,
    nombre: [trabajador.nombre, trabajador.apellido].filter(Boolean).join(' '),
    rol_nombre: null,
    contexto: CONTEXTO,
    es_supervisor: tipo === TIPO_SUPERVISOR
  };
  next();
});

const exigirSupervisor = (req, res, next) => {
  if (!req.usuario || !req.usuario.es_supervisor) {
    return next(new AppError('FORBIDDEN', 'no tiene permiso para esta accion', 403));
  }
  return next();
};

module.exports = {
  autenticarLaboral: autenticarLaboral,
  exigirSupervisor: exigirSupervisor
};
