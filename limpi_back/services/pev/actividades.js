/**
 * RF-PEV-02a — Definiciones de actividad (services/pev/actividades.js). Solo escritura de
 * `actividades` y `actividad_pasos`; los 3 pasos por defecto no son configurables en 02a (TASK_PLAN §1.3).
 * Errores con AppError; auditoría dentro de la MISMA transacción (RNF-SEC-02).
 */

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const Actividad = require('../../modelos/apartado_listas_pev/actividad');
const ActividadPaso = require('../../modelos/apartado_listas_pev/actividadPaso');
const Cliente = require('../../modelos/sistema_base/Cliente');

const LARGO_NOMBRE = 100;
const PASOS_DEFECTO = [
  { orden: 1, nombre: 'Despolvado', columna_legacy: 'despolvado' },
  { orden: 2, nombre: 'Aplicación de producto', columna_legacy: 'aplicacion_producto' },
  { orden: 3, nombre: 'Abrillantado', columna_legacy: 'abrillantado' }
];

function esDuplicado(err) {
  const nombre = err && err.name;
  if (nombre === 'SequelizeUniqueConstraintError') return true;
  const errno = (err && err.original && err.original.errno) || (err && err.parent && err.parent.errno);
  return errno === 1062; // ER_DUP_ENTRY
}

/**
 * @param {{cliente_id?: number, estado?: number, page?: number, limit?: number}} filtros
 * @returns {Promise<{rows: object[], count: number}>} filas con `pasos` ordenados por `orden`
 */
async function listar(filtros) {
  const f = filtros || {};
  const where = {};
  if (f.cliente_id) where.cliente_id = f.cliente_id;
  if (f.estado !== undefined && f.estado !== null && f.estado !== '') where.estado = f.estado;

  const page = f.page || 1;
  const limit = f.limit || 20;

  const r = await Actividad.findAndCountAll({
    where: where,
    include: [
      {
        model: ActividadPaso,
        as: 'pasos',
        separate: true,
        order: [['orden', 'ASC']]
      }
    ],
    order: [['id', 'DESC']],
    limit: limit,
    offset: (page - 1) * limit
  });

  return { rows: r.rows, count: r.count };
}

/**
 * POST /pev/actividades. Valida cliente, normaliza nombre (trim 1..100) y crea actividad + 3 pasos.
 * @param {{cliente_id: number, nombre: string}} entrada
 * @param {{usuario: {id: (number|null), contexto: string}, ip?: string}} contexto
 * @returns {Promise<object>} actividad creada (plana, con `pasos`)
 */
async function crear(entrada, contexto) {
  const e = entrada || {};
  const nombre = typeof e.nombre === 'string' ? e.nombre.trim() : '';
  if (!nombre || nombre.length > LARGO_NOMBRE) {
    throw new AppError('CAMPO_INVALIDO', 'nombre debe tener entre 1 y ' + LARGO_NOMBRE + ' caracteres', 400, { campo: 'nombre' });
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction(async function (t) {
      const cliente = await Cliente.findById(e.cliente_id, { attributes: ['id'], transaction: t });
      if (!cliente) {
        throw new AppError('CLIENTE_NO_EXISTE', 'no existe el cliente ' + e.cliente_id, 404, { cliente_id: e.cliente_id });
      }

      // Pre-check de duplicado (cliente_id, nombre) antes del INSERT (uq_actividades_cliente_nombre).
      const existente = await Actividad.findOne({
        where: { cliente_id: e.cliente_id, nombre: nombre },
        attributes: ['id'],
        transaction: t
      });
      if (existente) {
        throw new AppError('ACTIVIDAD_DUPLICADA', 'ya existe una actividad con ese nombre para el cliente', 409, {
          cliente_id: e.cliente_id,
          nombre: nombre
        });
      }

      let actividad;
      try {
        actividad = await Actividad.create(
          { cliente_id: e.cliente_id, nombre: nombre, estado: 1, origen: 'APP', created_by: contexto.usuario.id },
          { transaction: t }
        );
      } catch (err) {
        if (esDuplicado(err)) {
          throw new AppError('ACTIVIDAD_DUPLICADA', 'ya existe una actividad con ese nombre para el cliente', 409, {
            cliente_id: e.cliente_id,
            nombre: nombre
          });
        }
        throw err;
      }

      const pasos = [];
      for (const p of PASOS_DEFECTO) {
        pasos.push(
          await ActividadPaso.create(
            { actividad_id: actividad.id, orden: p.orden, nombre: p.nombre, columna_legacy: p.columna_legacy, estado: 1 },
            { transaction: t }
          )
        );
      }

      const despues = actividad.get({ plain: true });
      despues.pasos = pasos.map(function (p) { return p.get({ plain: true }); });

      await auditar({
        transaction: t,
        usuario: contexto.usuario,
        entidad: 'actividades',
        entidad_id: actividad.id,
        accion: 'CREAR',
        antes: null,
        despues: despues,
        ip: contexto.ip
      });

      return despues;
    });
  });
}

module.exports = { listar: listar, crear: crear };
