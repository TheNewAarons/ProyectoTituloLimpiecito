/**
 * RNF-SEC-01 (AUT-006): roles que pueden gestionar usuarios del sistema (crear, listar, editar a otros, cambiar
 * rol/estado, activar/desactivar). Se configura con ROLES_GESTION_USUARIOS (nombres de `roles.nombre` separados por
 * coma, sin distinguir mayúsculas). Si no está, solo Administrador (ROL_ADMIN_NOMBRES).
 */
const { ROL_ADMIN_NOMBRES } = require('../services/constantes');

const normalizar = (nombre) => String(nombre || '').trim().toLowerCase();

const desdeEntorno = String(process.env.ROLES_GESTION_USUARIOS || '')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const ROLES_GESTION_USUARIOS = desdeEntorno.length ? desdeEntorno : ROL_ADMIN_NOMBRES.slice();

const gestionaUsuarios = (rolNombre) =>
  !!normalizar(rolNombre) && ROLES_GESTION_USUARIOS.some((r) => normalizar(r) === normalizar(rolNombre));

module.exports = { ROLES_GESTION_USUARIOS, gestionaUsuarios };
