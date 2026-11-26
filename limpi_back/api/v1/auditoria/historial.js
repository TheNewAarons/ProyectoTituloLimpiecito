/**
 * RNF-SEC-02 (revisión de requerimientos: trazabilidad visible) — GET /api/v1/auditoria/historial
 * ?entidad=&entidad_id= (solo Admin; la sesión y el rol los aplica index.js sobre /api/v1/auditoria).
 * Historial de UNA entidad para el botón "Historial" del ERP: lo mismo que la auditoría, más el nombre y rol
 * de quien actuó (la tabla guarda solo usuario_id + contexto). Solo lectura.
 */
const Op = require('sequelize').Op;
const AppError = require('../../../libs/app-error');
const Auditoria = require('../../../modelos/sistema_base/Auditoria');
const Usuario = require('../../../modelos/sistema_base/Usuario');
const Role = require('../../../modelos/sistema_base/Role');
const { serializar } = require('./controlador');

const LIMITE = 100;

// Quien no es un usuario del ERP se muestra por su tipo (los ids de otras tablas no se resuelven aquí).
const ETIQUETA_CONTEXTO = {
  sistema: 'Sistema',
  acceso_clientes: 'Acceso de cliente',
  acceso_trabajadores: 'App laboral',
  usuario_apps: 'Usuario de la app'
};

async function nombresDeUsuarios(filas) {
  const ids = Array.from(new Set(filas.filter((f) => f.contexto_usuario === 'usuarios' && f.usuario_id).map((f) => f.usuario_id)));
  if (!ids.length) return {};
  const usuarios = await Usuario.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'nombre', 'apellido', 'roleId'] });
  const rolIds = Array.from(new Set(usuarios.map((u) => u.roleId).filter(Boolean)));
  const roles = rolIds.length ? await Role.findAll({ where: { id: { [Op.in]: rolIds } }, attributes: ['id', 'nombre'] }) : [];
  const rolPorId = {};
  roles.forEach((r) => { rolPorId[r.id] = r.nombre; });
  const r = {};
  usuarios.forEach((u) => {
    r[u.id] = { nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || ('Usuario #' + u.id), rol: rolPorId[u.roleId] || null };
  });
  return r;
}

function quien(fila, nombres) {
  if (fila.contexto_usuario === 'usuarios' && fila.usuario_id) {
    return nombres[fila.usuario_id] || { nombre: 'Usuario #' + fila.usuario_id, rol: null };
  }
  const etiqueta = ETIQUETA_CONTEXTO[fila.contexto_usuario] || fila.contexto_usuario || 'Desconocido';
  return { nombre: fila.usuario_id ? etiqueta + ' #' + fila.usuario_id : etiqueta, rol: null };
}

async function historial(req, res) {
  const q = req.query || {};
  const entidad = typeof q.entidad === 'string' ? q.entidad.trim() : '';
  const entidadId = typeof q.entidad_id === 'string' ? q.entidad_id.trim() : '';
  if (!/^[a-z_]{2,60}$/.test(entidad)) throw new AppError('CAMPO_INVALIDO', 'entidad invalida', 400, { campo: 'entidad' });
  if (!entidadId || entidadId.length > 64) throw new AppError('CAMPO_INVALIDO', 'entidad_id invalido', 400, { campo: 'entidad_id' });

  const filas = await Auditoria.findAll({
    where: { entidad: entidad, entidad_id: entidadId },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: LIMITE + 1
  });
  const hayMas = filas.length > LIMITE;
  const visibles = filas.slice(0, LIMITE);
  const nombres = await nombresDeUsuarios(visibles);
  const data = visibles.map((f) => Object.assign(serializar(f), { quien: quien(f, nombres) }));
  return res.json({ ok: true, data: data, meta: { entidad: entidad, entidad_id: entidadId, limite: LIMITE, hay_mas: hayMas } });
}

module.exports = { historial };
