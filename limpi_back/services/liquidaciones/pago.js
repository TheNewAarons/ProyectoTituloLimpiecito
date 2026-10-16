/**
 * RF-CAJA-02 — Máquina de estados de pago de liquidaciones (TASK_PLAN §2). Orden de locks fijo
 * (cajas -> liquidaciones -> egresos), READ_COMMITTED y un reintento ante deadlock/lock-timeout
 * (services/caja/cierre.js#reintentarTransaccion) antes de CONFLICTO_CONCURRENCIA.
 */

const Sequelize = require('sequelize');

const db = require('../../database/database');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const Egreso = require('../../modelos/sistema_base/Egreso');
const CentroCostoTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const CentroCosto = require('../../modelos/sistema_base/Centro_costo');
const Trabajadore = require('../../modelos/sistema_base/Trabajadore');

const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { auditar } = require('../auditoria');
const { EGRESO_ANULADO, EGRESO_TIPO_LIQUIDACION, CAJA_ABIERTA } = require('../constantes');
const { buscarCajaPorPeriodo } = require('../caja/periodo');
const { aEnteroCLP } = require('../caja/saldo');
const { reintentarTransaccion } = require('../caja/cierre');

const CAJA_ABIERTA_ESTADO = CAJA_ABIERTA;
const LIQUIDACION_CERRADA = 0;
const LOTE_MAXIMO = 500;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

/**
 * Comentario trazable para el egreso de pago: "Pago liquidación #<id> - <trabajador> - CC <numero_cc>".
 * Si la liquidación es huérfana (sin centro_costo_trabajadores), usa un comentario genérico.
 * @param {number} liquidacionId
 * @param {object} [transaction]
 * @returns {Promise<string>}
 */
async function construirComentario(liquidacionId, transaction) {
  const vinculo = await CentroCostoTrabajador.findOne({
    where: { liquidacioneId: liquidacionId },
    transaction: transaction
  });
  if (!vinculo) {
    return 'Pago liquidacion #' + liquidacionId;
  }
  const [trabajador, centro] = await Promise.all([
    vinculo.trabajadoreId ? Trabajadore.findById(vinculo.trabajadoreId, { transaction: transaction }) : null,
    vinculo.centroCostoId ? CentroCosto.findById(vinculo.centroCostoId, { transaction: transaction }) : null
  ]);
  const nombreTrabajador = trabajador ? (trabajador.nombre + ' ' + trabajador.apellido).trim() : 'desconocido';
  const numeroCc = centro ? centro.numero_cc : 's/n';
  return 'Pago liquidacion #' + liquidacionId + ' - ' + nombreTrabajador + ' - CC ' + numeroCc;
}

/**
 * Valida `fecha_pago`: formato YYYY-MM-DD, no futura (America/Santiago) y no anterior a
 * `fecha_creacion` de la liquidación.
 * @param {string} fechaPago
 * @param {Date|string|null} fechaCreacion
 */
function validarFechaPago(fechaPago, fechaCreacion) {
  if (!fecha.esFechaValida(fechaPago)) {
    throw new AppError('FECHA_PAGO_INVALIDA', 'fecha_pago invalida, formato esperado YYYY-MM-DD: ' + fechaPago, 400, { fecha_pago: fechaPago });
  }
  const hoy = fecha.hoySantiago();
  if (fecha.compararFechas(fechaPago, hoy) > 0) {
    throw new AppError('FECHA_PAGO_INVALIDA', 'fecha_pago no puede ser futura: ' + fechaPago, 400, { fecha_pago: fechaPago, hoy: hoy });
  }
  if (fechaCreacion) {
    const fechaCreacionStr = fechaCreacion instanceof Date
      ? fechaCreacion.toISOString().slice(0, 10)
      : String(fechaCreacion).slice(0, 10);
    if (fechaCreacionStr && fecha.compararFechas(fechaPago, fechaCreacionStr) < 0) {
      throw new AppError('FECHA_PAGO_INVALIDA', 'fecha_pago no puede ser anterior a fecha_creacion: ' + fechaPago, 400, {
        fecha_pago: fechaPago,
        fecha_creacion: fechaCreacionStr
      });
    }
  }
}

/**
 * Ejecuta el pago de una liquidación dentro de una transacción ya abierta por el llamador
 * (pagar/pagarLote comparten esta función; el orden de locks es cajas -> liquidaciones -> egresos).
 * @param {number} liquidacionId
 * @param {{fecha_pago: string, usuario: {id: number, contexto: string}, ip?: string}} datos
 * @param {object} t transacción activa
 * @returns {Promise<{liquidacion: object, egreso: object}>}
 */
async function _pagarEnTransaccion(liquidacionId, datos, t) {
  const fechaPago = datos.fecha_pago;
  const usuario = datos.usuario;
  const ip = datos.ip;

  const liquidacionPrevia = await Liquidacion.findById(liquidacionId, { transaction: t });
  if (!liquidacionPrevia) {
    throw new AppError('LIQUIDACION_NO_EXISTE', 'no existe la liquidacion ' + liquidacionId, 404, { liquidacion_id: liquidacionId });
  }
  validarFechaPago(fechaPago, liquidacionPrevia.fecha_creacion);

  const periodo = fechaPago.slice(0, 7);
  const caja = await buscarCajaPorPeriodo(periodo, { transaction: t, lock: t.LOCK.SHARE });
  if (!caja) {
    throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
  }
  if (caja.estado !== CAJA_ABIERTA_ESTADO) {
    throw new AppError('MES_CERRADO', 'la caja de ' + periodo + ' esta cerrada, reabrir primero', 409, { periodo: periodo });
  }

  const liquidacion = await Liquidacion.findById(liquidacionId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!liquidacion) {
    throw new AppError('LIQUIDACION_NO_EXISTE', 'no existe la liquidacion ' + liquidacionId, 404, { liquidacion_id: liquidacionId });
  }
  if (liquidacion.estado !== LIQUIDACION_CERRADA) {
    throw new AppError('LIQUIDACION_NO_CERRADA', 'la liquidacion ' + liquidacionId + ' no esta cerrada', 409, { liquidacion_id: liquidacionId });
  }
  if (liquidacion.estado_pago !== 'EN_ESPERA') {
    throw new AppError('ESTADO_PAGO_INVALIDO', 'la liquidacion ' + liquidacionId + ' no esta EN_ESPERA', 409, {
      liquidacion_id: liquidacionId,
      estado_pago: liquidacion.estado_pago
    });
  }
  const monto = aEnteroCLP(liquidacion.liquido_pagar);
  if (!(monto > 0)) {
    throw new AppError('MONTO_INVALIDO', 'liquido_pagar invalido para la liquidacion ' + liquidacionId, 422, { liquidacion_id: liquidacionId, monto: monto });
  }

  const comentario = await construirComentario(liquidacionId, t);
  const egreso = await Egreso.create(
    {
      monto: monto,
      comentario: comentario,
      fecha: fechaPago,
      estado: 1,
      tipo: EGRESO_TIPO_LIQUIDACION,
      usuarioId: usuario.id,
      cajaId: caja.id
    },
    { transaction: t }
  );

  const antes = liquidacion.get({ plain: true });
  await liquidacion.update(
    { estado_pago: 'PAGADA', fecha_pago: fechaPago, egreso_id: egreso.id, pagada_por: usuario.id },
    { transaction: t }
  );

  await auditar({
    transaction: t,
    usuario: usuario,
    entidad: 'liquidaciones',
    entidad_id: liquidacionId,
    accion: 'PAGO',
    antes: antes,
    despues: liquidacion,
    ip: ip
  });
  await auditar({
    transaction: t,
    usuario: usuario,
    entidad: 'egresos',
    entidad_id: egreso.id,
    accion: 'CREAR',
    antes: null,
    despues: egreso,
    ip: ip
  });

  return { liquidacion: liquidacion, egreso: egreso };
}

/**
 * Marca una liquidación EN_ESPERA como PAGADA, generando un egreso trazable en la caja del mes
 * de `fecha_pago`.
 * @param {number} liquidacionId
 * @param {{fecha_pago: string, usuario: {id: number, contexto: string}, ip?: string}} datos
 * @param {{transaction?: object}} [opciones] si se entrega `transaction`, se usa esa (no abre ni cierra ninguna)
 * @returns {Promise<{liquidacion: object, egreso: object}>}
 */
async function pagar(liquidacionId, datos, opciones) {
  const o = opciones || {};
  if (o.transaction) {
    return _pagarEnTransaccion(liquidacionId, datos, o.transaction);
  }
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, function (t) {
      return _pagarEnTransaccion(liquidacionId, datos, t);
    });
  });
}

/**
 * Paga un lote de liquidaciones de forma atómica (todo o nada). Deduplica y ordena los ids en
 * forma ascendente (orden de locks) antes de procesarlos.
 * @param {number[]} ids
 * @param {{fecha_pago: string, usuario: {id: number, contexto: string}, ip?: string}} datos
 * @returns {Promise<{pagadas: number[], monto_total: number, egresos: number[]}>}
 */
async function pagarLote(ids, datos) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('LOTE_INVALIDO', 'el lote de liquidaciones no puede estar vacio', 400);
  }
  if (!ids.every(function (id) { return Number.isInteger(id); })) {
    throw new AppError('LOTE_INVALIDO', 'todos los ids del lote deben ser enteros', 400);
  }
  const idsUnicos = Array.from(new Set(ids)).sort(function (a, b) { return a - b; });
  if (idsUnicos.length > LOTE_MAXIMO) {
    throw new AppError('LOTE_INVALIDO', 'el lote no puede superar ' + LOTE_MAXIMO + ' liquidaciones', 400, { cantidad: idsUnicos.length });
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const pagadas = [];
      const egresos = [];
      let montoTotal = 0;
      for (let i = 0; i < idsUnicos.length; i++) {
        const id = idsUnicos[i];
        try {
          const resultado = await _pagarEnTransaccion(id, datos, t);
          pagadas.push(resultado.liquidacion.id);
          egresos.push(resultado.egreso.id);
          montoTotal += aEnteroCLP(resultado.liquidacion.liquido_pagar);
        } catch (err) {
          err.details = Object.assign({}, err.details, { liquidacion_id: id });
          throw err;
        }
      }
      return { pagadas: pagadas, monto_total: montoTotal, egresos: egresos };
    });
  });
}

/**
 * Revierte un pago (PAGADA -> EN_ESPERA): anula lógicamente el egreso ligado (nunca `destroy`) y
 * limpia los campos de pago de la liquidación. Los pagos históricos (`egreso_id IS NULL`) no son
 * reversibles en este sprint (D-007).
 * @param {number} liquidacionId
 * @param {{motivo: string, usuario: {id: number, contexto: string}, ip?: string}} datos
 * @returns {Promise<{liquidacion: object, egreso_anulado: object}>}
 */
async function revertirPago(liquidacionId, datos) {
  const motivo = datos.motivo;
  const usuario = datos.usuario;
  const ip = datos.ip;

  if (!motivo) {
    throw new AppError('MOTIVO_REQUERIDO', 'la reversion de un pago requiere motivo', 400);
  }

  const liquidacionPrevia = await Liquidacion.findById(liquidacionId);
  if (!liquidacionPrevia) {
    throw new AppError('LIQUIDACION_NO_EXISTE', 'no existe la liquidacion ' + liquidacionId, 404, { liquidacion_id: liquidacionId });
  }
  if (liquidacionPrevia.estado_pago !== 'PAGADA' || !liquidacionPrevia.fecha_pago) {
    throw new AppError('ESTADO_PAGO_INVALIDO', 'la liquidacion ' + liquidacionId + ' no esta PAGADA', 409, {
      liquidacion_id: liquidacionId,
      estado_pago: liquidacionPrevia.estado_pago
    });
  }
  const fechaPagoLectura = String(liquidacionPrevia.fecha_pago);
  const periodo = fechaPagoLectura.slice(0, 7);

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const caja = await buscarCajaPorPeriodo(periodo, { transaction: t, lock: t.LOCK.SHARE });
      if (!caja) {
        throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
      }
      if (caja.estado !== CAJA_ABIERTA_ESTADO) {
        throw new AppError('MES_CERRADO', 'la caja de ' + periodo + ' esta cerrada, reabrir primero', 409, { periodo: periodo });
      }

      const liquidacion = await Liquidacion.findById(liquidacionId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!liquidacion) {
        throw new AppError('LIQUIDACION_NO_EXISTE', 'no existe la liquidacion ' + liquidacionId, 404, { liquidacion_id: liquidacionId });
      }
      if (liquidacion.estado_pago !== 'PAGADA') {
        throw new AppError('ESTADO_PAGO_INVALIDO', 'la liquidacion ' + liquidacionId + ' no esta PAGADA', 409, {
          liquidacion_id: liquidacionId,
          estado_pago: liquidacion.estado_pago
        });
      }
      if (String(liquidacion.fecha_pago) !== fechaPagoLectura) {
        throw new AppError('CONFLICTO_CONCURRENCIA', 'el pago de la liquidacion ' + liquidacionId + ' cambio antes de revertir', 409, {
          liquidacion_id: liquidacionId
        });
      }
      if (!liquidacion.egreso_id) {
        throw new AppError('PAGO_HISTORICO_NO_REVERSIBLE', 'el pago historico de la liquidacion ' + liquidacionId + ' no es reversible', 409, {
          liquidacion_id: liquidacionId
        });
      }

      const egreso = await Egreso.findById(liquidacion.egreso_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!egreso) {
        throw new AppError('PAGO_HISTORICO_NO_REVERSIBLE', 'el egreso del pago de la liquidacion ' + liquidacionId + ' no existe', 409, {
          liquidacion_id: liquidacionId
        });
      }

      const antesLiquidacion = liquidacion.get({ plain: true });
      const antesEgreso = egreso.get({ plain: true });

      await egreso.update({ estado: EGRESO_ANULADO }, { transaction: t });
      await liquidacion.update(
        { estado_pago: 'EN_ESPERA', fecha_pago: null, egreso_id: null, pagada_por: null },
        { transaction: t }
      );

      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'liquidaciones',
        entidad_id: liquidacionId,
        accion: 'REVERSION_PAGO',
        antes: antesLiquidacion,
        despues: liquidacion,
        motivo: motivo,
        ip: ip
      });
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'egresos',
        entidad_id: egreso.id,
        accion: 'REVERSION_PAGO',
        antes: antesEgreso,
        despues: egreso,
        motivo: motivo,
        ip: ip
      });

      return { liquidacion: liquidacion, egreso_anulado: egreso };
    });
  });
}

module.exports = {
  pagar: pagar,
  pagarLote: pagarLote,
  revertirPago: revertirPago
};
