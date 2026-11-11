/**
 * RF-FAC-01 — Estado de pago de documentos (cc_ingresos / egresos). Mismo patrón de
 * services/liquidaciones/pago.js: transacción + lock de fila + auditoría. `egresos` (caja) tiene
 * impacto directo en el saldo de caja (columna cajaId); `cc_ingresos` no impacta caja hoy
 * (services/caja/saldo.js usa centro_costos.precio_servicio, no cc_ingresos), así que solo se
 * exige caja ABIERTA cuando `impactaCaja` es true.
 */

const db = require('../../database/database');
const Sequelize = require('sequelize');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const Caja = require('../../modelos/sistema_base/Caja');
const { auditar } = require('../auditoria');
const { buscarCajaPorPeriodo } = require('../caja/periodo');
const { reintentarTransaccion } = require('../caja/cierre');
const { CAJA_ABIERTA } = require('../constantes');

const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

/**
 * @param {string} fechaPago
 */
function validarFechaPago(fechaPago) {
  if (!fecha.esFechaValida(fechaPago)) {
    throw new AppError('FECHA_PAGO_INVALIDA', 'fecha_pago invalida, formato esperado YYYY-MM-DD: ' + fechaPago, 400, { fecha_pago: fechaPago });
  }
  if (fecha.compararFechas(fechaPago, fecha.hoySantiago()) > 0) {
    throw new AppError('FECHA_PAGO_INVALIDA', 'fecha_pago no puede ser futura: ' + fechaPago, 400, { fecha_pago: fechaPago });
  }
}

/**
 * Caja del periodo de `fechaPago`; exige que exista y esté ABIERTA (si no, 409 MES_CERRADO: hay
 * que reabrir el mes primero, igual que RF-CAJA-01 regla 6).
 * @param {string} fechaPago
 * @param {object} t
 * @returns {Promise<object>}
 */
async function cajaAbiertaDeFechaPago(fechaPago, t) {
  const periodo = fechaPago.slice(0, 7);
  const caja = await buscarCajaPorPeriodo(periodo, { transaction: t, lock: t.LOCK.SHARE });
  if (!caja) {
    throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
  }
  if (caja.estado !== CAJA_ABIERTA) {
    throw new AppError('MES_CERRADO', 'la caja de ' + periodo + ' esta cerrada, reabrir primero', 409, { periodo: periodo });
  }
  return caja;
}

/**
 * Bloquea (SHARE) la caja REAL asignada al egreso (`fila.cajaId`, la que fija `pagar()`), no la
 * derivada del periodo de `fecha_pago`. Devuelve el `cajaId` bloqueado para verificar que no cambió
 * tras bloquear la fila. Debe llamarse ANTES de bloquear la fila (orden global de locks:
 * cajas -> egresos).
 * @param {object} fila lectura sin lock del egreso
 * @param {number} id
 * @param {object} t transacción activa
 * @returns {Promise<number>} cajaId bloqueado
 */
async function bloquearCajaRealDelEgreso(fila, id, t) {
  if (fila.cajaId === null || fila.cajaId === undefined) {
    throw new AppError('CAJA_NO_ASIGNADA', 'el registro ' + id + ' no tiene caja asignada', 409, { id: id });
  }
  if (fila.fecha_pago === null || fila.fecha_pago === undefined) {
    throw new AppError('FECHA_PAGO_INVALIDA', 'el registro ' + id + ' no tiene fecha_pago registrada', 409, { id: id });
  }
  const caja = await Caja.findById(fila.cajaId, { transaction: t, lock: t.LOCK.SHARE });
  if (!caja) {
    throw new AppError('CAJA_NO_EXISTE', 'no existe la caja ' + fila.cajaId + ' asignada al registro ' + id, 404, { cajaId: fila.cajaId });
  }
  if (caja.estado !== CAJA_ABIERTA) {
    throw new AppError('MES_CERRADO', 'la caja de ' + caja.periodo + ' esta cerrada, reabrir primero', 409, { periodo: caja.periodo });
  }
  return fila.cajaId;
}

/**
 * Marca PENDIENTE -> PAGADA. Si `config.impactaCaja`, fija `cajaId` a la caja del periodo de
 * `fecha_pago` (debe estar ABIERTA).
 * @param {object} config {modelo, entidad, impactaCaja}
 * @param {number} id
 * @param {{fecha_pago: string, usuario: {id:number, contexto:string}, ip?: string}} datos
 */
async function pagar(config, id, datos) {
  validarFechaPago(datos.fecha_pago);
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      let caja = null;
      if (config.impactaCaja) {
        caja = await cajaAbiertaDeFechaPago(datos.fecha_pago, t);
      }
      const fila = await config.modelo.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fila) {
        throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id + ' en ' + config.entidad, 404, { id: id });
      }
      if (fila.estado_pago !== 'PENDIENTE') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' no esta PENDIENTE', 409, {
          id: id,
          estado_pago: fila.estado_pago
        });
      }
      const antes = fila.get({ plain: true });
      const cambios = { estado_pago: 'PAGADA', fecha_pago: datos.fecha_pago };
      if (config.impactaCaja) cambios.cajaId = caja.id;
      await fila.update(cambios, { transaction: t });
      await auditar({
        transaction: t,
        usuario: datos.usuario,
        entidad: config.entidad,
        entidad_id: id,
        accion: 'PAGO',
        antes: antes,
        despues: fila,
        ip: datos.ip
      });
      return fila;
    });
  });
}

/**
 * Anula un registro (PENDIENTE o PAGADA -> ANULADA, terminal). Nunca borra la fila (RNF/spec).
 * Si estaba PAGADA e `impactaCaja`, exige que la caja donde impacta (su `cajaId` actual) esté
 * ABIERTA antes de anular (si no, 409 MES_CERRADO).
 * @param {object} config
 * @param {number} id
 * @param {{motivo: string, usuario: object, ip?: string}} datos
 */
async function anular(config, id, datos) {
  if (!datos.motivo) {
    throw new AppError('MOTIVO_REQUERIDO', 'la anulacion requiere motivo', 400);
  }
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      // Lectura sin lock para decidir si hay que bloquear caja (orden global: cajas -> egresos).
      const filaSinLock = await config.modelo.findById(id, { transaction: t });
      if (!filaSinLock) {
        throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id + ' en ' + config.entidad, 404, { id: id });
      }
      if (filaSinLock.estado_pago === 'ANULADA') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' ya esta ANULADA', 409, { id: id });
      }
      let cajaIdBloqueada = null;
      if (config.impactaCaja && filaSinLock.estado_pago === 'PAGADA') {
        cajaIdBloqueada = await bloquearCajaRealDelEgreso(filaSinLock, id, t);
      }
      const fila = await config.modelo.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fila) {
        throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id + ' en ' + config.entidad, 404, { id: id });
      }
      if (fila.estado_pago === 'ANULADA') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' ya esta ANULADA', 409, { id: id });
      }
      if (cajaIdBloqueada !== null && fila.cajaId !== cajaIdBloqueada) {
        throw new AppError('CAJA_CAMBIO_CONCURRENTE', 'la caja del registro cambio durante la operacion, reintentar', 409, { id: id });
      }
      const antes = fila.get({ plain: true });
      await fila.update({ estado_pago: 'ANULADA' }, { transaction: t });
      await auditar({
        transaction: t,
        usuario: datos.usuario,
        entidad: config.entidad,
        entidad_id: id,
        accion: 'ANULAR',
        antes: antes,
        despues: fila,
        motivo: datos.motivo,
        ip: datos.ip
      });
      return fila;
    });
  });
}

/**
 * Revierte PAGADA -> PENDIENTE (solo Admin, motivo obligatorio). Limpia `fecha_pago`; conserva
 * `cajaId` (irrelevante en PENDIENTE: no se suma al saldo).
 * @param {object} config
 * @param {number} id
 * @param {{motivo: string, usuario: object, ip?: string}} datos
 */
async function revertir(config, id, datos) {
  if (!datos.motivo) {
    throw new AppError('MOTIVO_REQUERIDO', 'la reversion requiere motivo', 400);
  }
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      // Lectura sin lock para decidir si hay que bloquear caja (orden global: cajas -> egresos).
      const filaSinLock = await config.modelo.findById(id, { transaction: t });
      if (!filaSinLock) {
        throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id + ' en ' + config.entidad, 404, { id: id });
      }
      if (filaSinLock.estado_pago !== 'PAGADA') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' no esta PAGADA', 409, {
          id: id,
          estado_pago: filaSinLock.estado_pago
        });
      }
      let cajaIdBloqueada = null;
      if (config.impactaCaja) {
        cajaIdBloqueada = await bloquearCajaRealDelEgreso(filaSinLock, id, t);
      }
      const fila = await config.modelo.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!fila) {
        throw new AppError('REGISTRO_NO_EXISTE', 'no existe el registro ' + id + ' en ' + config.entidad, 404, { id: id });
      }
      if (fila.estado_pago !== 'PAGADA') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'el registro ' + id + ' no esta PAGADA', 409, {
          id: id,
          estado_pago: fila.estado_pago
        });
      }
      if (cajaIdBloqueada !== null && fila.cajaId !== cajaIdBloqueada) {
        throw new AppError('CAJA_CAMBIO_CONCURRENTE', 'la caja del registro cambio durante la operacion, reintentar', 409, { id: id });
      }
      const antes = fila.get({ plain: true });
      await fila.update({ estado_pago: 'PENDIENTE', fecha_pago: null }, { transaction: t });
      await auditar({
        transaction: t,
        usuario: datos.usuario,
        entidad: config.entidad,
        entidad_id: id,
        accion: 'REVERSION_PAGO',
        antes: antes,
        despues: fila,
        motivo: datos.motivo,
        ip: datos.ip
      });
      return fila;
    });
  });
}

module.exports = {
  pagar: pagar,
  anular: anular,
  revertir: revertir
};
