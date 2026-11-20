/**
 * RF-PEV-02a — Asignaciones de trabajadores a actividades (services/pev/asignaciones.js).
 * Sin DELETE físico: cerrar/anular + auditoría en la MISMA transacción (D-104). Nunca toca
 * actividades/actividad_pasos ni hace destroy. Locks en orden fijo (actividades -> tareas ->
 * actividad_asignaciones) para evitar deadlocks (TASK_PLAN §1.3).
 */

const Sequelize = require('sequelize');

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const { fechaLinea } = require('./backfill');
const Actividad = require('../../modelos/apartado_listas_pev/actividad');
const ActividadAsignacion = require('../../modelos/apartado_listas_pev/actividadAsignacion');
const Area = require('../../modelos/apartado_listas_pev/area');
const Sector = require('../../modelos/apartado_listas_pev/sector');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const Turno = require('../../modelos/apartado_listas_pev/turno');
const Tarea = require('../../modelos/apartado_listas_pev/tarea');
const TurnoTarea = require('../../modelos/apartado_listas_pev/turnoTarea');

const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const ESTADOS = ['ACTIVA', 'CERRADA', 'ANULADA'];
const ATRIBUTOS_TRABAJADOR = ['id', 'nombre', 'apellido', 'n_empleado']; // sin datos sensibles (rut/teléfono/correo)

function esDuplicado(err) {
  const nombre = err && err.name;
  if (nombre === 'SequelizeUniqueConstraintError') return true;
  const errno = (err && err.original && err.original.errno) || (err && err.parent && err.parent.errno);
  return errno === 1062; // ER_DUP_ENTRY
}

/**
 * @param {{cliente_id?: number, actividad_id?: number, area_id?: number, trabajador_id?: number,
 *          turno_id?: number, estado?: string, vigente_en?: string, page?: number, limit?: number}} filtros
 * @returns {Promise<{rows: object[], count: number}>}
 */
async function listar(filtros) {
  const f = filtros || {};
  const where = {};

  if (f.actividad_id) where.actividad_id = f.actividad_id;
  if (f.area_id) where.area_id = f.area_id;
  if (f.trabajador_id) where.trabajador_id = f.trabajador_id;
  if (f.turno_id) where.turno_id = f.turno_id;

  if (f.vigente_en) {
    // "Vigente en d" = ACTIVA o CERRADA con d dentro de [fecha_desde, fecha_hasta] (D-104).
    where.estado = { [Op.in]: ['ACTIVA', 'CERRADA'] };
    where.fecha_desde = { [Op.lte]: f.vigente_en };
    where[Op.or] = [{ fecha_hasta: null }, { fecha_hasta: { [Op.gte]: f.vigente_en } }];
  } else if (f.estado) {
    where.estado = f.estado;
  }

  const incluyeActividad = {
    model: Actividad,
    as: 'actividad',
    attributes: ['id', 'nombre', 'cliente_id'],
    required: true
  };
  if (f.cliente_id) incluyeActividad.where = { cliente_id: f.cliente_id };

  const page = f.page || 1;
  const limit = f.limit || 20;

  const r = await ActividadAsignacion.findAndCountAll({
    where: where,
    include: [
      incluyeActividad,
      { model: Area, as: 'area', attributes: ['id', 'nombre'] },
      { model: Trabajadore, as: 'trabajador', attributes: ATRIBUTOS_TRABAJADOR },
      { model: Turno, as: 'turno', attributes: ['id', 'nombre'] }
    ],
    order: [['fecha_desde', 'DESC'], ['id', 'DESC']],
    limit: limit,
    offset: (page - 1) * limit
  });

  return { rows: r.rows, count: r.count };
}

/**
 * Tarea puente (D-105): resuelve/lockea la tarea legacy de la asignación y garantiza la fila
 * `turnos_tareas` (turnoId, tareaId, estado 1). Recibe la tarea ya lockeada si vino por `tarea_id`.
 * @param {object} actividad fila de `actividades` (ya lockeada)
 * @param {object} area fila de `areas`
 * @param {number} turnoId
 * @param {{id: number, contexto: string}} usuario
 * @param {string} ip
 * @param {object} t transacción activa
 * @param {object|null} tareaPropuesta tarea lockeada (cuando vino `tarea_id`) o null
 * @returns {Promise<number>} id de la tarea puente
 */
async function resolverTareaPuente(actividad, area, turnoId, usuario, ip, t, tareaPropuesta) {
  let tareaId;

  if (tareaPropuesta) {
    // (a) tarea_id explícito: misma área y actividadId NULL o igual (ya validado antes de lockear).
    if (tareaPropuesta.actividadId === null || tareaPropuesta.actividadId === undefined) {
      const antes = tareaPropuesta.get({ plain: true });
      await tareaPropuesta.update({ actividadId: actividad.id }, { transaction: t });
      await auditar({
        transaction: t, usuario: usuario, entidad: 'tareas', entidad_id: tareaPropuesta.id, accion: 'EDITAR',
        antes: antes, despues: tareaPropuesta, ip: ip
      });
    }
    tareaId = tareaPropuesta.id;
  } else {
    // (b) buscar tarea con actividadId + areaId (menor id).
    const existente = await Tarea.findOne({
      where: { actividadId: actividad.id, areaId: area.id },
      order: [['id', 'ASC']],
      transaction: t
    });
    // (b') D-105: reutilizar tarea legacy del área con el mismo nombre y sin actividad.
    const legacy = existente ? null : await Tarea.findOne({
      where: { areaId: area.id, nombre: actividad.nombre, actividadId: null },
      order: [['id', 'ASC']],
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    if (existente) {
      tareaId = existente.id;
    } else if (legacy) {
      const antes = legacy.get({ plain: true });
      await legacy.update({ actividadId: actividad.id }, { transaction: t });
      await auditar({
        transaction: t, usuario: usuario, entidad: 'tareas', entidad_id: legacy.id, accion: 'EDITAR',
        antes: antes, despues: legacy, ip: ip
      });
      tareaId = legacy.id;
    } else {
      // (c) crear tarea puente con el nombre de la actividad.
      const nueva = await Tarea.create(
        { nombre: actividad.nombre, estado: 1, areaId: area.id, actividadId: actividad.id },
        { transaction: t }
      );
      await auditar({
        transaction: t, usuario: usuario, entidad: 'tareas', entidad_id: nueva.id, accion: 'CREAR',
        antes: null, despues: nueva, ip: ip
      });
      tareaId = nueva.id;
    }
  }

  const turnoTarea = await TurnoTarea.findOne({ where: { turnoId: turnoId, tareaId: tareaId, estado: 1 }, transaction: t });
  if (!turnoTarea) {
    await TurnoTarea.create({ turnoId: turnoId, tareaId: tareaId, estado: 1 }, { transaction: t });
  }

  return tareaId;
}

/**
 * POST /pev/asignaciones. turno_id obligatorio; sin fecha_hasta al crear (D-104).
 * @param {{actividad_id: number, area_id: number, trabajador_id: number, turno_id: number,
 *          fecha_desde?: string, tarea_id?: number}} entrada
 * @param {{usuario: {id: (number|null), contexto: string}, ip?: string}} contexto
 * @returns {Promise<object>} asignación creada (plana)
 */
async function crear(entrada, contexto) {
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, function (t) {
      return crearEnTx(t, entrada, contexto);
    });
  });
}

/**
 * RF-PEV-01 (AUT-008): mismo alta que crear() pero dentro de una transacción ya abierta,
 * para que la asignación masiva cree N asignaciones todo-o-nada.
 * @param {object} t transacción activa
 */
async function crearEnTx(t, entrada, contexto) {
  const e = entrada || {};
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  const fechaDesde = e.fecha_desde || fecha.hoySantiago();

      // 1) Lock de la actividad (serializa todas las altas de esa actividad).
      const actividad = await Actividad.findById(e.actividad_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!actividad) {
        throw new AppError('ACTIVIDAD_NO_EXISTE', 'no existe la actividad ' + e.actividad_id, 404, { actividad_id: e.actividad_id });
      }
      if (Number(actividad.estado) !== 1) {
        throw new AppError('ACTIVIDAD_INACTIVA', 'la actividad no está activa', 409, { actividad_id: actividad.id });
      }

      // 2) Si viene tarea_id, lock de la tarea (antes de actividad_asignaciones).
      let tareaPropuesta = null;
      if (e.tarea_id) {
        tareaPropuesta = await Tarea.findById(e.tarea_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!tareaPropuesta) {
          throw new AppError('TAREA_NO_EXISTE', 'no existe la tarea ' + e.tarea_id, 404, { tarea_id: e.tarea_id });
        }
        if (Number(tareaPropuesta.areaId) !== Number(e.area_id)) {
          throw new AppError('TAREA_INCOMPATIBLE', 'la tarea pertenece a otra área', 409, { tarea_id: e.tarea_id, area_id: e.area_id });
        }
        if (tareaPropuesta.actividadId !== null && tareaPropuesta.actividadId !== undefined && Number(tareaPropuesta.actividadId) !== Number(e.actividad_id)) {
          throw new AppError('TAREA_INCOMPATIBLE', 'la tarea ya está vinculada a otra actividad', 409, { tarea_id: e.tarea_id });
        }
      }

      // Validación de área/cliente (area.sector.clienteId = actividad.cliente_id).
      const area = await Area.findById(e.area_id, { transaction: t });
      if (!area) {
        throw new AppError('AREA_NO_EXISTE', 'no existe el área ' + e.area_id, 404, { area_id: e.area_id });
      }
      const sector = await Sector.findById(area.sectoreId, { transaction: t });
      if (!sector || Number(sector.clienteId) !== Number(actividad.cliente_id)) {
        throw new AppError('AREA_CLIENTE_DISTINTO', 'el área no pertenece al cliente de la actividad', 409, {
          area_id: area.id,
          cliente_id: actividad.cliente_id
        });
      }

      // turno_id obligatorio y del mismo cliente.
      const turno = await Turno.findById(e.turno_id, { transaction: t });
      if (!turno) {
        throw new AppError('TURNO_NO_EXISTE', 'no existe el turno ' + e.turno_id, 404, { turno_id: e.turno_id });
      }
      if (Number(turno.clienteId) !== Number(actividad.cliente_id)) {
        throw new AppError('TURNO_CLIENTE_DISTINTO', 'el turno no pertenece al cliente de la actividad', 409, {
          turno_id: turno.id,
          cliente_id: actividad.cliente_id
        });
      }

      // Trabajador existe (404 si no). No se valida contra trabajadores_clientes (semántica sin confirmar).
      const trabajador = await Trabajadore.findById(e.trabajador_id, { attributes: ['id'], transaction: t });
      if (!trabajador) {
        throw new AppError('TRABAJADOR_NO_EXISTE', 'no existe el trabajador ' + e.trabajador_id, 404, { trabajador_id: e.trabajador_id });
      }

      // 3) Lock de asignaciones de la misma clave (turno_id siempre no-null por la API) para duplicados/solapamiento.
      const existentes = await ActividadAsignacion.findAll({
        where: {
          actividad_id: e.actividad_id,
          area_id: e.area_id,
          trabajador_id: e.trabajador_id,
          turno_id: e.turno_id
        },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      const activa = existentes.filter(function (x) { return x.estado === 'ACTIVA'; })[0];
      if (activa) {
        throw new AppError('ASIGNACION_DUPLICADA', 'ya existe una asignación ACTIVA para esa clave', 409, {
          actividad_id: e.actividad_id,
          area_id: e.area_id,
          trabajador_id: e.trabajador_id,
          turno_id: e.turno_id
        });
      }

      const solapada = existentes.filter(function (x) {
        return x.estado === 'CERRADA' && x.fecha_hasta !== null && x.fecha_hasta >= fechaDesde;
      })[0];
      if (solapada) {
        throw new AppError('VIGENCIA_SOLAPADA', 'ya existe una asignación CERRADA que cubre la fecha de inicio', 409, {
          actividad_id: e.actividad_id,
          area_id: e.area_id,
          trabajador_id: e.trabajador_id,
          turno_id: e.turno_id,
          fecha_desde: fechaDesde
        });
      }

      const tareaId = await resolverTareaPuente(actividad, area, e.turno_id, usuario, ip, t, tareaPropuesta);

      let asignacion;
      try {
        asignacion = await ActividadAsignacion.create(
          {
            actividad_id: e.actividad_id,
            area_id: e.area_id,
            trabajador_id: e.trabajador_id,
            tarea_id: tareaId,
            turno_id: e.turno_id,
            fecha_desde: fechaDesde,
            fecha_hasta: null,
            estado: 'ACTIVA',
            activa_flag: 1,
            origen: 'APP',
            motivo: null,
            created_by: usuario.id,
            cerrada_by: null,
            cerrada_at: null
          },
          { transaction: t }
        );
      } catch (err) {
        // Respaldo: 1062 sobre uq_asig_activa (INSERT concurrente) -> ASIGNACION_DUPLICADA.
        if (esDuplicado(err)) {
          throw new AppError('ASIGNACION_DUPLICADA', 'ya existe una asignación ACTIVA para esa clave', 409, {
            actividad_id: e.actividad_id,
            area_id: e.area_id,
            trabajador_id: e.trabajador_id,
            turno_id: e.turno_id
          });
        }
        throw err;
      }

      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'actividad_asignaciones',
        entidad_id: asignacion.id,
        accion: 'CREAR',
        antes: null,
        despues: asignacion,
        ip: ip
      });

      return asignacion.get({ plain: true });
}

/**
 * ¿Alguna línea PEV/supervisor referencia esta asignación? (consulta parametrizada: las columnas
 * `asignacionId` de las tablas legacy NO están declaradas en sus modelos hasta 02b, D-103).
 * @param {number} id
 * @param {object} t transacción activa
 * @returns {Promise<boolean>}
 */
async function tieneHistorial(id, t) {
  const sql =
    'SELECT ' +
    '(SELECT COUNT(*) FROM linea_lista_pev_trabajadores WHERE asignacionId = :id) + ' +
    '(SELECT COUNT(*) FROM linea_lista_super_trabajadores WHERE asignacionId = :id) AS total';
  const filas = await db.sequelize.query(sql, {
    replacements: { id: id },
    type: Sequelize.QueryTypes.SELECT,
    transaction: t
  });
  return Number(filas[0].total) > 0;
}

// RF-PEV-02c (D-136): líneas con asignacionId = id y fecha D-117 > fecha_hasta. Solo se cuentan, no se tocan.
async function contarLineasPosteriores(id, fechaHasta, t) {
  const sqlPev =
    'SELECT DATE_FORMAT(lp.fecha_chequeo, \'%Y-%m-%dT%H:%i:%sZ\') AS fecha_utc, HOUR(lp.fecha_chequeo) AS hora_utc ' +
    'FROM linea_lista_pev_trabajadores l JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
    'WHERE l.asignacionId = :id';
  const sqlSuper =
    'SELECT DATE_FORMAT(lp.fecha_chequeo, \'%Y-%m-%dT%H:%i:%sZ\') AS fecha_utc, HOUR(lp.fecha_chequeo) AS hora_utc ' +
    'FROM linea_lista_super_trabajadores ls ' +
    'JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ' +
    'JOIN listas_pev_trabajadores lp ON lp.id = st.listasPevTrabajadoreId ' +
    'WHERE ls.asignacionId = :id';
  const contar = function (filas) {
    return filas.filter(function (f) {
      const hora = f.hora_utc === null || f.hora_utc === undefined ? null : Number(f.hora_utc);
      const fecha = fechaLinea(f.fecha_utc, hora);
      return fecha !== null && fecha > fechaHasta;
    }).length;
  };
  const pev = await db.sequelize.query(sqlPev, { replacements: { id: id }, type: Sequelize.QueryTypes.SELECT, transaction: t });
  const sup = await db.sequelize.query(sqlSuper, { replacements: { id: id }, type: Sequelize.QueryTypes.SELECT, transaction: t });
  return contar(pev) + contar(sup);
}

/**
 * @param {number} id
 * @param {{fecha_hasta?: string, motivo?: string}} datos
 * @param {{usuario: {id: (number|null), contexto: string}, ip?: string}} contexto
 * @returns {Promise<object>} asignación cerrada (plana)
 */
async function cerrar(id, datos, contexto) {
  const d = datos || {};
  const usuario = contexto.usuario;
  const ip = contexto.ip;

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const inicial = await ActividadAsignacion.findById(id, { transaction: t });
      if (!inicial) {
        throw new AppError('ASIGNACION_NO_EXISTE', 'no existe la asignación ' + id, 404, { id: id });
      }

      // Orden de locks: actividad -> asignación.
      await Actividad.findById(inicial.actividad_id, { transaction: t, lock: t.LOCK.UPDATE });
      const asignacion = await ActividadAsignacion.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!asignacion) {
        throw new AppError('ASIGNACION_NO_EXISTE', 'no existe la asignación ' + id, 404, { id: id });
      }

      if (asignacion.estado !== 'ACTIVA') {
        throw new AppError('ESTADO_INVALIDO', 'solo se puede cerrar una asignación ACTIVA', 409, { estado: asignacion.estado });
      }

      const fechaHasta = d.fecha_hasta || fecha.hoySantiago();
      if (!fecha.esFechaValida(fechaHasta) || fechaHasta < asignacion.fecha_desde) {
        throw new AppError('CAMPO_INVALIDO', 'fecha_hasta debe ser YYYY-MM-DD y mayor o igual a fecha_desde', 400, { campo: 'fecha_hasta' });
      }

      const antes = asignacion.get({ plain: true });
      await asignacion.update(
        { estado: 'CERRADA', activa_flag: null, fecha_hasta: fechaHasta, motivo: d.motivo || null, cerrada_by: usuario.id, cerrada_at: new Date() },
        { transaction: t }
      );

      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'actividad_asignaciones',
        entidad_id: asignacion.id,
        accion: 'CIERRE',
        antes: antes,
        despues: asignacion,
        motivo: d.motivo || null,
        ip: ip
      });

      const plano = asignacion.get({ plain: true });
      plano.lineas_posteriores = await contarLineasPosteriores(id, fechaHasta, t);
      return plano;
    });
  });
}

/**
 * @param {number} id
 * @param {{motivo: string}} datos motivo obligatorio (trim 5..500)
 * @param {{usuario: {id: (number|null), contexto: string}, ip?: string}} contexto
 * @returns {Promise<object>} asignación anulada (plana)
 */
async function anular(id, datos, contexto) {
  const d = datos || {};
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  const motivo = typeof d.motivo === 'string' ? d.motivo.trim() : '';
  if (motivo.length < 5 || motivo.length > 500) {
    throw new AppError('CAMPO_INVALIDO', 'motivo debe tener entre 5 y 500 caracteres', 400, { campo: 'motivo' });
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const inicial = await ActividadAsignacion.findById(id, { transaction: t });
      if (!inicial) {
        throw new AppError('ASIGNACION_NO_EXISTE', 'no existe la asignación ' + id, 404, { id: id });
      }

      // Orden de locks: actividad -> asignación.
      await Actividad.findById(inicial.actividad_id, { transaction: t, lock: t.LOCK.UPDATE });
      const asignacion = await ActividadAsignacion.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!asignacion) {
        throw new AppError('ASIGNACION_NO_EXISTE', 'no existe la asignación ' + id, 404, { id: id });
      }

      if (asignacion.estado === 'ANULADA') {
        throw new AppError('ESTADO_INVALIDO', 'la asignación ya está ANULADA', 409, { estado: asignacion.estado });
      }

      if (await tieneHistorial(id, t)) {
        throw new AppError('ASIGNACION_CON_HISTORIAL', 'la asignación ya tiene líneas de historial y no se puede anular', 409, { id: id });
      }

      const antes = asignacion.get({ plain: true });
      await asignacion.update(
        { estado: 'ANULADA', activa_flag: null, motivo: motivo, cerrada_by: usuario.id, cerrada_at: new Date() },
        { transaction: t }
      );

      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'actividad_asignaciones',
        entidad_id: asignacion.id,
        accion: 'ANULAR',
        antes: antes,
        despues: asignacion,
        motivo: motivo,
        ip: ip
      });

      return asignacion.get({ plain: true });
    });
  });
}

module.exports = {
  listar: listar,
  crear: crear,
  crearEnTx: crearEnTx,
  cerrar: cerrar,
  anular: anular,
  ESTADOS: ESTADOS
};
