/**
 * RF-CAJA-01 — Cierre/reapertura/recálculo de caja (TASK_PLAN §1). Transacciones READ_COMMITTED
 * explícitas, orden de locks fijo (cajas -> liquidaciones -> egresos) y un reintento automático
 * ante deadlock (MySQL 1213) / lock wait timeout (1205) antes de CONFLICTO_CONCURRENCIA.
 *
 * Desvío menor del diseño (anotado, no afecta firmas): el reintento de transacción (regla
 * "Concurrencia / locks") no tenía archivo propio en el plan; se implementa aquí y se reexporta
 * para que services/liquidaciones/pago.js lo reutilice, en vez de duplicar la lógica.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require('../../database/database');
const Caja = require('../../modelos/sistema_base/Caja');
const CentroCosto = require('../../modelos/sistema_base/Centro_costo');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { CAJA_ABIERTA, CAJA_CERRADA } = require('../constantes');
const { buscarCajaPorPeriodo } = require('./periodo');
const { calcularSaldo, aEnteroCLP } = require('./saldo');

const CENTRO_ABIERTO = 1;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

/**
 * Suma/resta meses a un periodo 'YYYY-MM'.
 * @param {string} periodo
 * @param {number} delta meses a desplazar (puede ser negativo)
 * @returns {string} 'YYYY-MM'
 */
function desplazarPeriodo(periodo, delta) {
  const partes = periodo.split('-');
  const d = new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1 + delta, 1));
  const mes = d.getUTCMonth() + 1;
  return d.getUTCFullYear() + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Primer día del periodo a mediodía UTC (evita corrimientos de día por zona horaria al derivar
 * `periodo` desde `fecha_inicio` con el hook del modelo Caja).
 * @param {string} periodo 'YYYY-MM'
 * @returns {Date}
 */
function primerDiaDePeriodo(periodo) {
  return new Date(periodo + '-01T12:00:00Z');
}

/**
 * Errno de MySQL (deadlock 1213 / lock wait timeout 1205) de un error de Sequelize, si existe.
 * @param {Error} err
 * @returns {number|undefined}
 */
function errnoMysql(err) {
  if (err && err.original && err.original.errno) return err.original.errno;
  if (err && err.parent && err.parent.errno) return err.parent.errno;
  return undefined;
}

/**
 * Ejecuta una transacción completa con un reintento ante deadlock/lock-timeout (regla global de
 * concurrencia de caja/pagos); al segundo fallo lanza CONFLICTO_CONCURRENCIA.
 * @param {() => Promise<any>} ejecutar función que abre y corre la transacción completa
 * @returns {Promise<any>}
 */
async function reintentarTransaccion(ejecutar) {
  try {
    return await ejecutar();
  } catch (primerError) {
    const errno = errnoMysql(primerError);
    if (errno !== 1213 && errno !== 1205) throw primerError;
    try {
      return await ejecutar();
    } catch (segundoError) {
      const errno2 = errnoMysql(segundoError);
      if (errno2 === 1213 || errno2 === 1205) {
        throw new AppError('CONFLICTO_CONCURRENCIA', 'conflicto de concurrencia de caja tras un reintento', 409, { errno: errno2 });
      }
      throw segundoError;
    }
  }
}

/**
 * Cierra el mes `periodo`: congela saldo_final, encadena saldo_inicial del mes siguiente (o lo
 * crea), y recalcula en cascada si hay meses posteriores ya cerrados (re-cierre tras reapertura).
 * @param {string} periodo 'YYYY-MM'
 * @param {{usuario: {id: number, contexto: string}, ip?: string}} contexto
 * @returns {Promise<{caja: object, siguiente: object|null, recalculados: string[]}>}
 */
async function cerrarMes(periodo, contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const caja = await buscarCajaPorPeriodo(periodo, { transaction: t, lock: t.LOCK.UPDATE });
      if (!caja) {
        throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
      }
      if (caja.estado !== CAJA_ABIERTA) {
        throw new AppError('MES_YA_CERRADO', 'la caja de ' + periodo + ' ya esta cerrada', 409, { periodo: periodo });
      }

      const periodoAnterior = desplazarPeriodo(periodo, -1);
      const cajaAnterior = await buscarCajaPorPeriodo(periodoAnterior, { transaction: t, lock: t.LOCK.UPDATE });
      if (cajaAnterior && cajaAnterior.estado === CAJA_ABIERTA) {
        throw new AppError('MES_ANTERIOR_ABIERTO', 'la caja de ' + periodoAnterior + ' sigue abierta', 409, { periodo: periodoAnterior });
      }

      const centrosAbiertos = await CentroCosto.count({
        where: { cajaId: caja.id, estado: CENTRO_ABIERTO },
        transaction: t
      });
      if (centrosAbiertos > 0) {
        throw new AppError('CENTROS_ABIERTOS', centrosAbiertos + ' centro(s) de costo abiertos en ' + periodo, 409, { periodo: periodo, cantidad: centrosAbiertos });
      }

      const saldoInicial = cajaAnterior
        ? (cajaAnterior.saldo_final !== null && cajaAnterior.saldo_final !== undefined
          ? aEnteroCLP(cajaAnterior.saldo_final)
          : aEnteroCLP(cajaAnterior.saldo_inicial))
        : aEnteroCLP(caja.saldo_inicial);

      const mov = await calcularSaldo(periodo, { transaction: t });
      const saldoFinal = saldoInicial + mov.ingresos - mov.egresos.total;

      const antesCaja = caja.get({ plain: true });
      await caja.update(
        {
          estado: CAJA_CERRADA,
          fecha_cierre: new Date(),
          cerrada_por: usuario.id,
          saldo_inicial: saldoInicial,
          saldo_final: saldoFinal,
          total_ingreso: mov.ingresos,
          total_egreso: mov.egresos.total,
          utilidad: mov.ingresos - mov.egresos.total
        },
        { transaction: t }
      );
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'cajas',
        entidad_id: caja.id,
        accion: 'CIERRE',
        antes: antesCaja,
        despues: caja,
        ip: ip
      });

      const periodoSiguiente = desplazarPeriodo(periodo, 1);
      const cajaSiguiente = await buscarCajaPorPeriodo(periodoSiguiente, { transaction: t, lock: t.LOCK.UPDATE });
      let recalculados = [];
      let siguiente = cajaSiguiente;

      if (!cajaSiguiente) {
        // `cajas.id` no siempre tiene AUTO_INCREMENT (typo historico "autoIncrment" en el modelo,
        // H5 del plan): se calcula el siguiente id explicitamente para no depender de eso.
        const maxId = await Caja.max('id', { transaction: t });
        siguiente = await Caja.create(
          {
            id: (maxId || 0) + 1,
            periodo: periodoSiguiente,
            fecha_inicio: primerDiaDePeriodo(periodoSiguiente),
            estado: CAJA_ABIERTA,
            saldo_inicial: saldoFinal,
            saldo_final: null,
            saldo_provisional: true,
            total_ingreso: 0,
            total_egreso: 0,
            utilidad: 0,
            total_perdida: 0
          },
          { transaction: t }
        );
        await auditar({
          transaction: t,
          usuario: usuario,
          entidad: 'cajas',
          entidad_id: siguiente.id,
          accion: 'CREAR',
          antes: null,
          despues: siguiente,
          ip: ip
        });
      } else if (cajaSiguiente.estado === CAJA_ABIERTA) {
        const antesSig = cajaSiguiente.get({ plain: true });
        await cajaSiguiente.update({ saldo_inicial: saldoFinal, saldo_provisional: false }, { transaction: t });
        await auditar({
          transaction: t,
          usuario: usuario,
          entidad: 'cajas',
          entidad_id: cajaSiguiente.id,
          accion: 'RECALCULO',
          antes: antesSig,
          despues: cajaSiguiente,
          ip: ip
        });
      } else {
        recalculados = await recalcularCascada(periodoSiguiente, { transaction: t, usuario: usuario, ip: ip });
      }

      return { caja: caja, siguiente: siguiente, recalculados: recalculados.map(function (r) { return r.periodo; }) };
    });
  });
}

/**
 * Reabre un mes cerrado (deja `saldo_final`/`fecha_cierre`/`cerrada_por` en NULL). Los meses
 * posteriores no se tocan hasta el re-cierre (que dispara `recalcularCascada` desde `cerrarMes`).
 * @param {string} periodo 'YYYY-MM'
 * @param {{usuario: {id: number, contexto: string}, motivo: string, ip?: string}} contexto
 * @returns {Promise<{caja: object}>}
 */
async function reabrirMes(periodo, contexto) {
  const usuario = contexto.usuario;
  const motivo = contexto.motivo;
  const ip = contexto.ip;

  if (!motivo) {
    throw new AppError('MOTIVO_REQUERIDO', 'la reapertura de un mes requiere motivo', 400);
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const caja = await buscarCajaPorPeriodo(periodo, { transaction: t, lock: t.LOCK.UPDATE });
      if (!caja) {
        throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
      }
      if (caja.estado !== CAJA_CERRADA) {
        throw new AppError('MES_NO_CERRADO', 'la caja de ' + periodo + ' no esta cerrada', 409, { periodo: periodo });
      }

      const antes = caja.get({ plain: true });
      await caja.update({ estado: CAJA_ABIERTA, saldo_final: null, fecha_cierre: null, cerrada_por: null }, { transaction: t });
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'cajas',
        entidad_id: caja.id,
        accion: 'REAPERTURA',
        antes: antes,
        despues: caja,
        motivo: motivo,
        ip: ip
      });

      return { caja: caja };
    });
  });
}

/**
 * Recalcula saldo_inicial encadenado (y saldo_final si está cerrada, preservando su movimiento
 * congelado) de todas las cajas desde `desdePeriodo` en adelante. Exige la transacción del llamador.
 * @param {string} desdePeriodo 'YYYY-MM'
 * @param {{transaction: object, usuario: {id: number, contexto: string}, ip?: string}} contexto
 * @returns {Promise<Array<{periodo: string, saldo_inicial_antes: number, saldo_inicial: number, saldo_final_antes: (number|null), saldo_final: (number|null)}>>}
 */
async function recalcularCascada(desdePeriodo, contexto) {
  const t = contexto && contexto.transaction;
  if (!t) {
    throw new AppError('TRANSACCION_REQUERIDA', 'recalcularCascada requiere la transaccion del llamador', 500);
  }
  const usuario = contexto.usuario;
  const ip = contexto.ip;

  const periodoAnterior = desplazarPeriodo(desdePeriodo, -1);
  const cajaAnterior = await buscarCajaPorPeriodo(periodoAnterior, { transaction: t, lock: t.LOCK.UPDATE });
  let saldoPrevio = cajaAnterior
    ? (cajaAnterior.saldo_final !== null && cajaAnterior.saldo_final !== undefined
      ? aEnteroCLP(cajaAnterior.saldo_final)
      : aEnteroCLP(cajaAnterior.saldo_inicial))
    : 0;

  const cajas = await Caja.findAll({
    where: { periodo: { [Op.gte]: desdePeriodo } },
    order: [['periodo', 'ASC']],
    lock: t.LOCK.UPDATE,
    transaction: t
  });

  const resultado = [];
  for (let i = 0; i < cajas.length; i++) {
    const caja = cajas[i];
    const saldoInicialAntes = aEnteroCLP(caja.saldo_inicial);
    const saldoFinalAntes = caja.saldo_final === null || caja.saldo_final === undefined ? null : aEnteroCLP(caja.saldo_final);
    const antes = caja.get({ plain: true });

    const nuevoSaldoInicial = saldoPrevio;
    let nuevoSaldoFinal = saldoFinalAntes;

    if (caja.estado === CAJA_CERRADA) {
      const movimientoCongelado = saldoFinalAntes === null ? 0 : saldoFinalAntes - saldoInicialAntes;
      nuevoSaldoFinal = nuevoSaldoInicial + movimientoCongelado;
      await caja.update({ saldo_inicial: nuevoSaldoInicial, saldo_final: nuevoSaldoFinal }, { transaction: t });
      saldoPrevio = nuevoSaldoFinal;
    } else {
      await caja.update({ saldo_inicial: nuevoSaldoInicial, saldo_provisional: true }, { transaction: t });
      saldoPrevio = nuevoSaldoInicial;
    }

    if (nuevoSaldoInicial !== saldoInicialAntes || nuevoSaldoFinal !== saldoFinalAntes) {
      await auditar({
        transaction: t,
        usuario: usuario,
        entidad: 'cajas',
        entidad_id: caja.id,
        accion: 'RECALCULO',
        antes: antes,
        despues: caja,
        ip: ip
      });
    }

    resultado.push({
      periodo: caja.periodo,
      saldo_inicial_antes: saldoInicialAntes,
      saldo_inicial: nuevoSaldoInicial,
      saldo_final_antes: saldoFinalAntes,
      saldo_final: nuevoSaldoFinal
    });
  }

  return resultado;
}

module.exports = {
  cerrarMes: cerrarMes,
  reabrirMes: reabrirMes,
  recalcularCascada: recalcularCascada,
  reintentarTransaccion: reintentarTransaccion,
  desplazarPeriodo: desplazarPeriodo
};
