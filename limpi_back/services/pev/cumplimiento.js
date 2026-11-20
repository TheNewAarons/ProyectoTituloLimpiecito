/**
 * RF-PEV-02c — Cumplimiento (trabajador) y verificación (supervisor) por asignación.
 * Escribe en las columnas legacy de linea_lista_pev_trabajadores / linea_lista_super_trabajadores,
 * localizadas por la línea del día y validadas por su `asignacionId` (D-131). Sin migración ni tabla
 * nueva; sin destroy. Locks en orden fijo: asignación (LOCK IN SHARE MODE) -> línea (FOR UPDATE).
 * Hora fijada por el servidor en America/Santiago (el cliente no puede retrodatar, D-135).
 */

const Sequelize = require('sequelize');

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const { fechaLinea } = require('./backfill');
const { hoySantiago } = require('../../libs/fecha');
const ActividadAsignacion = require('../../modelos/apartado_listas_pev/actividadAsignacion');
const LineaPev = require('../../modelos/apartado_listas_pev/lineaListaPevTrabajador');
const LineaSuper = require('../../modelos/apartado_listas_pev/lineaSuperTrabajador');
const ListaPev = require('../../modelos/apartado_listas_pev/listaPevTrabajador');
const ListaSuper = require('../../modelos/apartado_listas_pev/listaSuperTrabajador');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');

const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;
const ZONA = 'America/Santiago';

// Hora del servidor en America/Santiago, formato TIME ('HH:mm:ss'). No se acepta hora del cliente.
const FORMATO_HORA = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

function horaServidor() {
  const partes = FORMATO_HORA.formatToParts(new Date());
  const valor = function (tipo) {
    const p = partes.filter(function (x) { return x.type === tipo; })[0];
    return p ? p.value : '00';
  };
  return valor('hour') + ':' + valor('minute') + ':' + valor('second');
}

// Fecha de negocio (D-117) de un `fecha_chequeo` Date/string, vía backfill.fechaLinea.
function fechaDeLinea(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return null;
  return fechaLinea(d.toISOString().slice(0, 19) + 'Z', d.getUTCHours());
}

// Fecha de negocio desde una fila cruda (fecha_utc = DATE_FORMAT, hora_utc = HOUR).
function fechaRaw(f) {
  const hora = f.hora_utc === null || f.hora_utc === undefined ? null : Number(f.hora_utc);
  return fechaLinea(f.fecha_utc, hora);
}

function dentroDeVigencia(asignacion, fecha) {
  if (!fecha) return false;
  if (fecha < asignacion.fecha_desde) return false;
  if (asignacion.fecha_hasta !== null && asignacion.fecha_hasta !== undefined && fecha > asignacion.fecha_hasta) return false;
  return true;
}

const SQL_LINEAS_PEV_DIA =
  'SELECT l.id AS id, l.asignacionId AS asignacionId, l.listasPevTrabajadoreId AS listasPevTrabajadoreId, ' +
  'l.tareaId AS tareaId, ' +
  'l.check_trabajador_1 AS check_trabajador_1, l.hora_check_trabajador_1 AS hora_check_trabajador_1, ' +
  'l.check_trabajador_2 AS check_trabajador_2, l.hora_check_trabajador_2 AS hora_check_trabajador_2, ' +
  'l.check_trabajador_3 AS check_trabajador_3, l.hora_check_trabajador_3 AS hora_check_trabajador_3, ' +
  'l.observaciones AS observaciones, ' +
  'lp.id AS lista_id, lp.estado AS lista_estado, ' +
  "DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fecha_utc, HOUR(lp.fecha_chequeo) AS hora_utc " +
  'FROM linea_lista_pev_trabajadores l ' +
  'JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
  'JOIN actividad_asignaciones aa ON aa.id = l.asignacionId ' +
  "WHERE aa.trabajador_id = :trabajadorId AND aa.estado IN ('ACTIVA','CERRADA') " +
  'AND aa.fecha_desde <= :fecha AND (aa.fecha_hasta IS NULL OR aa.fecha_hasta >= :fecha) ' +
  // Ventana amplia en SQL (±1 día por el desfase UTC/Santiago); la fecha exacta D-117 se filtra en JS.
  'AND lp.fecha_chequeo >= :desde AND lp.fecha_chequeo < :hasta';

const SQL_LINEAS_PEV_HISTORIAL =
  'SELECT l.id AS id, l.asignacionId AS asignacionId, l.listasPevTrabajadoreId AS listasPevTrabajadoreId, ' +
  'l.tareaId AS tareaId, ' +
  'l.check_trabajador_1 AS check_trabajador_1, l.hora_check_trabajador_1 AS hora_check_trabajador_1, ' +
  'l.check_trabajador_2 AS check_trabajador_2, l.hora_check_trabajador_2 AS hora_check_trabajador_2, ' +
  'l.check_trabajador_3 AS check_trabajador_3, l.hora_check_trabajador_3 AS hora_check_trabajador_3, ' +
  'l.observaciones AS observaciones, ' +
  'lp.id AS lista_id, lp.estado AS lista_estado, ' +
  "DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fecha_utc, HOUR(lp.fecha_chequeo) AS hora_utc " +
  'FROM linea_lista_pev_trabajadores l ' +
  'JOIN listas_pev_trabajadores lp ON lp.id = l.listasPevTrabajadoreId ' +
  'WHERE l.asignacionId = :id';

const SQL_LINEAS_SUPER_HISTORIAL =
  'SELECT ls.id AS id, ls.asignacionId AS asignacionId, ls.listasSuperTrabajadoreId AS listasSuperTrabajadoreId, ' +
  'ls.tareaId AS tareaId, ' +
  'ls.hora_1 AS hora_1, ls.despolvado_1 AS despolvado_1, ls.aplicacion_producto_1 AS aplicacion_producto_1, ' +
  'ls.abrillantado_1 AS abrillantado_1, ' +
  'ls.hora_2 AS hora_2, ls.despolvado_2 AS despolvado_2, ls.aplicacion_producto_2 AS aplicacion_producto_2, ' +
  'ls.abrillantado_2 AS abrillantado_2, ' +
  'ls.hora_3 AS hora_3, ls.despolvado_3 AS despolvado_3, ls.aplicacion_producto_3 AS aplicacion_producto_3, ' +
  'ls.abrillantado_3 AS abrillantado_3, ' +
  'ls.observaciones AS observaciones, ' +
  'st.id AS lista_id, st.estado AS lista_estado, ' +
  "DATE_FORMAT(lp.fecha_chequeo, '%Y-%m-%dT%H:%i:%sZ') AS fecha_utc, HOUR(lp.fecha_chequeo) AS hora_utc " +
  'FROM linea_lista_super_trabajadores ls ' +
  'JOIN listas_super_trabajadores st ON st.id = ls.listasSuperTrabajadoreId ' +
  'JOIN listas_pev_trabajadores lp ON lp.id = st.listasPevTrabajadoreId ' +
  'WHERE ls.asignacionId = :id';

function serializarLineaPev(linea, lista) {
  const listaId = lista ? lista.id : linea.lista_id;
  const listaEstado = lista ? Number(lista.estado) : (linea.lista_estado === undefined ? null : Number(linea.lista_estado));
  return {
    id: linea.id,
    asignacionId: linea.asignacionId,
    lista_id: listaId !== undefined ? listaId : linea.listasPevTrabajadoreId,
    lista_estado: listaEstado,
    tarea_id: linea.tareaId,
    pasos: [1, 2, 3].map(function (n) {
      return {
        paso: n,
        marcado: Number(linea['check_trabajador_' + n]) === 1 ? 1 : 0,
        hora: linea['hora_check_trabajador_' + n] || null
      };
    }),
    observaciones: linea.observaciones || null
  };
}

function serializarLineaSuper(linea, listaSuper) {
  const listaId = listaSuper ? listaSuper.id : linea.lista_id;
  const listaEstado = listaSuper ? Number(listaSuper.estado) : (linea.lista_estado === undefined ? null : Number(linea.lista_estado));
  return {
    id: linea.id,
    asignacionId: linea.asignacionId,
    lista_id: listaId !== undefined ? listaId : linea.listasSuperTrabajadoreId,
    lista_estado: listaEstado,
    tarea_id: linea.tareaId,
    rondas: [1, 2, 3].map(function (n) {
      return {
        ronda: n,
        hora: linea['hora_' + n] || null,
        despolvado: Number(linea['despolvado_' + n]) === 1 ? 1 : 0,
        aplicacion_producto: Number(linea['aplicacion_producto_' + n]) === 1 ? 1 : 0,
        abrillantado: Number(linea['abrillantado_' + n]) === 1 ? 1 : 0
      };
    }),
    observaciones: linea.observaciones || null
  };
}

// Precondiciones comunes para una línea de trabajador. Deja la línea lockeada FOR UPDATE al final.
async function prepararLineaPev(lineaId, usuario, t) {
  let linea = await LineaPev.findById(lineaId, { transaction: t });
  if (!linea) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la linea ' + lineaId, 404, { linea_id: lineaId });
  }
  if (linea.asignacionId === null || linea.asignacionId === undefined) {
    throw new AppError('LINEA_SIN_ASIGNACION', 'la linea no esta asociada a una asignacion', 409, { linea_id: lineaId });
  }
  const asignacion = await ActividadAsignacion.findById(linea.asignacionId, { transaction: t, lock: t.LOCK.SHARE });
  if (!asignacion) {
    throw new AppError('ASIGNACION_NO_VIGENTE', 'la asignacion no esta vigente', 409, { linea_id: lineaId });
  }
  // Propiedad antes de cualquier 409: no revelar estado de listas/asignaciones ajenas.
  if (Number(asignacion.trabajador_id) !== Number(usuario.id)) {
    throw new AppError('ASIGNACION_AJENA', 'la linea pertenece a otra asignacion', 403, { linea_id: lineaId });
  }
  // Lock compartido: la firma legacy no puede colarse entre el chequeo de estado y el UPDATE.
  const lista = await ListaPev.findById(linea.listasPevTrabajadoreId, { transaction: t, lock: t.LOCK.SHARE });
  if (!lista) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la lista de la linea', 404, { linea_id: lineaId });
  }
  if (Number(lista.estado) !== 1) {
    throw new AppError('LISTA_FIRMADA', 'la lista ya esta firmada', 409, { lista_id: lista.id });
  }
  if (asignacion.estado === 'ANULADA' || !dentroDeVigencia(asignacion, fechaDeLinea(lista.fecha_chequeo))) {
    throw new AppError('ASIGNACION_NO_VIGENTE', 'la asignacion no esta vigente para la fecha de la linea', 409, { asignacion_id: asignacion.id });
  }
  // Sin marcas por adelantado: la hora del servidor quedaria en una fecha que aun no ocurre (D-141).
  if (fechaDeLinea(lista.fecha_chequeo) > hoySantiago()) {
    throw new AppError('LINEA_FUTURA', 'la linea corresponde a una fecha futura', 409, { linea_id: lineaId });
  }
  linea = await LineaPev.findById(lineaId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!linea) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la linea ' + lineaId, 404, { linea_id: lineaId });
  }
  return { linea: linea, lista: lista, asignacion: asignacion };
}

// Precondiciones comunes para una línea de supervisor. Deja la línea lockeada FOR UPDATE al final.
async function prepararLineaSuper(lineaId, usuario, t) {
  let linea = await LineaSuper.findById(lineaId, { transaction: t });
  if (!linea) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la linea ' + lineaId, 404, { linea_id: lineaId });
  }
  if (linea.asignacionId === null || linea.asignacionId === undefined) {
    throw new AppError('LINEA_SIN_ASIGNACION', 'la linea no esta asociada a una asignacion', 409, { linea_id: lineaId });
  }
  const asignacion = await ActividadAsignacion.findById(linea.asignacionId, { transaction: t, lock: t.LOCK.SHARE });
  if (!asignacion) {
    throw new AppError('ASIGNACION_NO_VIGENTE', 'la asignacion no esta vigente', 409, { linea_id: lineaId });
  }
  // Lock compartido: la firma legacy no puede colarse entre el chequeo de estado y el UPDATE.
  const listaSuper = await ListaSuper.findById(linea.listasSuperTrabajadoreId, { transaction: t, lock: t.LOCK.SHARE });
  if (!listaSuper) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la lista de la linea', 404, { linea_id: lineaId });
  }
  // Propiedad por n_empleado (nunca por body), antes de cualquier 409. Si el n_empleado es ambiguo, se rechaza (D-134).
  const nEmpleado = usuario.n_empleado;
  if (nEmpleado === null || nEmpleado === undefined) {
    throw new AppError('LISTA_AJENA', 'la lista pertenece a otro supervisor', 403, { linea_id: lineaId });
  }
  const trabajadores = await Trabajadore.findAll({ where: { n_empleado: nEmpleado }, attributes: ['id'], transaction: t });
  if (trabajadores.length !== 1) {
    throw new AppError('LISTA_AJENA', 'la lista pertenece a otro supervisor', 403, { linea_id: lineaId });
  }
  if (Number(listaSuper.n_empleado) !== Number(nEmpleado)) {
    throw new AppError('LISTA_AJENA', 'la lista pertenece a otro supervisor', 403, { linea_id: lineaId });
  }
  if (Number(listaSuper.estado) !== 1) {
    throw new AppError('LISTA_FIRMADA', 'la lista ya esta firmada', 409, { lista_id: listaSuper.id });
  }
  const listaPev = await ListaPev.findById(listaSuper.listasPevTrabajadoreId, { transaction: t });
  if (!listaPev) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la lista PEV asociada', 404, { linea_id: lineaId });
  }
  if (asignacion.estado === 'ANULADA' || !dentroDeVigencia(asignacion, fechaDeLinea(listaPev.fecha_chequeo))) {
    throw new AppError('ASIGNACION_NO_VIGENTE', 'la asignacion no esta vigente para la fecha de la linea', 409, { asignacion_id: asignacion.id });
  }
  // Sin marcas por adelantado: la hora del servidor quedaria en una fecha que aun no ocurre (D-141).
  if (fechaDeLinea(listaPev.fecha_chequeo) > hoySantiago()) {
    throw new AppError('LINEA_FUTURA', 'la linea corresponde a una fecha futura', 409, { linea_id: lineaId });
  }
  linea = await LineaSuper.findById(lineaId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!linea) {
    throw new AppError('LINEA_NO_EXISTE', 'no existe la linea ' + lineaId, 404, { linea_id: lineaId });
  }
  return { linea: linea, listaSuper: listaSuper, listaPev: listaPev, asignacion: asignacion };
}

/**
 * Marca el paso `paso` (1..3) del trabajador en una línea PEV. Solo marca (no desmarca); idempotente.
 * @param {number} lineaId
 * @param {number} paso
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 * @returns {Promise<{sin_cambios: boolean, linea: object}>}
 */
async function marcarPaso(lineaId, paso, contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const { linea, lista } = await prepararLineaPev(lineaId, usuario, t);
      const campo = 'check_trabajador_' + paso;
      const campoHora = 'hora_check_trabajador_' + paso;
      if (Number(linea[campo]) === 1) {
        return { sin_cambios: true, linea: serializarLineaPev(linea, lista) };
      }
      const antes = linea.get({ plain: true });
      await linea.update({ [campo]: 1, [campoHora]: horaServidor() }, { transaction: t, fields: [campo, campoHora] });
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'linea_lista_pev_trabajadores',
        entidad_id: linea.id,
        accion: 'EDITAR',
        antes: antes,
        despues: linea,
        ip: ip
      });
      return { sin_cambios: false, linea: serializarLineaPev(linea, lista) };
    });
  });
}

/**
 * Chequea la ronda `ronda` (1..3) de una línea de supervisor. Los 3 valores son obligatorios (0/1)
 * y ya validados en la capa HTTP; aquí se derivan las columnas sin tocar req.body (mass assignment).
 * @param {number} lineaId
 * @param {number} ronda
 * @param {{despolvado: number, aplicacion_producto: number, abrillantado: number}} valores
 * @param {{usuario: {id: number, contexto: string, n_empleado: (number|null)}, ip?: string}} contexto
 * @returns {Promise<{sin_cambios: boolean, linea: object}>}
 */
async function chequear(lineaId, ronda, valores, contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const { linea, listaSuper } = await prepararLineaSuper(lineaId, usuario, t);
      const bases = ['despolvado', 'aplicacion_producto', 'abrillantado'];
      const cambios = {};
      let hayCambio = false;
      bases.forEach(function (base) {
        const col = base + '_' + ronda;
        const nuevo = valores[base] === 1 ? 1 : 0;
        cambios[col] = nuevo;
        if (Number(linea[col]) !== nuevo) hayCambio = true;
      });
      if (linea['hora_' + ronda] === null || linea['hora_' + ronda] === undefined) {
        cambios['hora_' + ronda] = horaServidor();
        hayCambio = true;
      }
      if (!hayCambio) {
        return { sin_cambios: true, linea: serializarLineaSuper(linea, listaSuper) };
      }
      const antes = linea.get({ plain: true });
      await linea.update(cambios, { transaction: t, fields: Object.keys(cambios) });
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'linea_lista_super_trabajadores',
        entidad_id: linea.id,
        accion: 'EDITAR',
        antes: antes,
        despues: linea,
        ip: ip
      });
      return { sin_cambios: false, linea: serializarLineaSuper(linea, listaSuper) };
    });
  });
}

/**
 * Sobrescribe la observación de una línea de supervisor (igual que legacy). El valor anterior queda
 * en auditoria.antes (D-131). `observaciones` ya viene validada (string trim 0..255; '' -> null).
 * @param {number} lineaId
 * @param {string|null} observaciones
 * @param {{usuario: {id: number, contexto: string, n_empleado: (number|null)}, ip?: string}} contexto
 * @returns {Promise<{sin_cambios: boolean, linea: object}>}
 */
async function observar(lineaId, observaciones, contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const { linea, listaSuper } = await prepararLineaSuper(lineaId, usuario, t);
      const nuevo = observaciones === '' ? null : observaciones;
      const actual = linea.observaciones || null;
      if (actual === nuevo) {
        return { sin_cambios: true, linea: serializarLineaSuper(linea, listaSuper) };
      }
      const antes = linea.get({ plain: true });
      await linea.update({ observaciones: nuevo }, { transaction: t, fields: ['observaciones'] });
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'linea_lista_super_trabajadores',
        entidad_id: linea.id,
        accion: 'EDITAR',
        antes: antes,
        despues: linea,
        ip: ip
      });
      return { sin_cambios: false, linea: serializarLineaSuper(linea, listaSuper) };
    });
  });
}

/**
 * Líneas PEV del día `fecha` (Santiago) para las asignaciones vigentes del trabajador.
 * @param {number} trabajadorId
 * @param {string} fecha 'YYYY-MM-DD'
 * @returns {Promise<object[]>}
 */
async function delDia(trabajadorId, fecha) {
  const dia = Date.parse(fecha + 'T00:00:00Z');
  const desde = new Date(dia - 86400000).toISOString().slice(0, 10);
  const hasta = new Date(dia + 2 * 86400000).toISOString().slice(0, 10);
  const filas = await db.sequelize.query(SQL_LINEAS_PEV_DIA, {
    replacements: { trabajadorId: trabajadorId, fecha: fecha, desde: desde, hasta: hasta },
    type: Sequelize.QueryTypes.SELECT
  });
  return filas
    .filter(function (f) { return fechaRaw(f) === fecha; })
    .map(function (f) { return serializarLineaPev(f); });
}

function filaHistorialPev(f) {
  const base = serializarLineaPev(f);
  base.tipo = 'trabajador';
  base.fecha = fechaRaw(f);
  return base;
}

function filaHistorialSuper(f) {
  const base = serializarLineaSuper(f);
  base.tipo = 'supervisor';
  base.fecha = fechaRaw(f);
  return base;
}

/**
 * Líneas PEV + supervisor con asignacionId = id, aunque la asignación esté CERRADA/ANULADA.
 * @param {number} id
 * @param {{desde?: string, hasta?: string, page?: number, limit?: number}} filtros
 * @returns {Promise<{rows: object[], count: number}>}
 */
async function historial(id, filtros) {
  const asignacion = await ActividadAsignacion.findById(id, { attributes: ['id'] });
  if (!asignacion) {
    throw new AppError('ASIGNACION_NO_EXISTE', 'no existe la asignacion ' + id, 404, { id: id });
  }
  const f = filtros || {};
  const pev = await db.sequelize.query(SQL_LINEAS_PEV_HISTORIAL, {
    replacements: { id: id },
    type: Sequelize.QueryTypes.SELECT
  });
  const sup = await db.sequelize.query(SQL_LINEAS_SUPER_HISTORIAL, {
    replacements: { id: id },
    type: Sequelize.QueryTypes.SELECT
  });
  const filas = pev.map(filaHistorialPev).concat(sup.map(filaHistorialSuper));
  const desde = f.desde;
  const hasta = f.hasta;
  const filtradas = filas.filter(function (fila) {
    if (desde && (!fila.fecha || fila.fecha < desde)) return false;
    if (hasta && (!fila.fecha || fila.fecha > hasta)) return false;
    return true;
  });
  filtradas.sort(function (a, b) {
    if (a.fecha === b.fecha) return b.id - a.id;
    return (a.fecha || '') < (b.fecha || '') ? 1 : -1;
  });
  const page = f.page || 1;
  const limit = f.limit || 20;
  const offset = (page - 1) * limit;
  return { rows: filtradas.slice(offset, offset + limit), count: filtradas.length };
}

module.exports = {
  marcarPaso: marcarPaso,
  chequear: chequear,
  observar: observar,
  delDia: delDia,
  historial: historial
};
