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

const db = require('../../database/database');
const Caja = require('../../modelos/sistema_base/Caja');
const fecha = require('../../libs/fecha');
const CentroCosto = require('../../modelos/sistema_base/Centro_costo');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { CAJA_ABIERTA, CAJA_CERRADA } = require('../constantes');
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
 * @param {{incluirDuplicado?: boolean}} [opciones] incluirDuplicado: reintenta también ER_DUP_ENTRY (1062)
 * @returns {Promise<any>}
 */
async function reintentarTransaccion(ejecutar, opciones) {
  // 1062 (ER_DUP_ENTRY) solo se reintenta en operaciones de estructura de caja (cierre, reapertura,
  // cron): al reintentar la caja ya existe y la operación sigue su camino normal. Pagos no lo piden.
  const reintentables = [1213, 1205];
  if (opciones && opciones.incluirDuplicado) reintentables.push(1062);
  try {
    return await ejecutar();
  } catch (primerError) {
    const errno = errnoMysql(primerError);
    if (reintentables.indexOf(errno) === -1) throw primerError;
    try {
      return await ejecutar();
    } catch (segundoError) {
      const errno2 = errnoMysql(segundoError);
      if (reintentables.indexOf(errno2) !== -1) {
        throw new AppError('CONFLICTO_CONCURRENCIA', 'conflicto de concurrencia de caja tras un reintento', 409, { errno: errno2 });
      }
      throw segundoError;
    }
  }
}

/**
 * Mutex de estructura de caja: bloquea TODAS las filas de `cajas` (FOR UPDATE) en orden
 * cronológico ascendente. Lo ejecutan primero cerrar, reabrir y el cron: mismo plan => mismo orden
 * de adquisición => sin deadlocks entre ellos, y se serializan entre sí. Orden global de locks:
 * cajas (periodo ASC) -> liquidaciones -> egresos.
 * @param {object} t transacción activa
 * @returns {Promise<object[]>} instancias de `cajas` (datos vigentes tras el lock), periodo ASC
 */
function bloquearCajas(t) {
  return Caja.findAll({ order: [['periodo', 'ASC']], lock: t.LOCK.UPDATE, transaction: t });
}

/**
 * Caja ancla: la existente con el mayor periodo estrictamente menor a `periodo` (soporta huecos).
 * @param {object[]} cajas ordenadas por periodo ASC
 * @param {string} periodo 'YYYY-MM'
 * @returns {object|null}
 */
function buscarAncla(cajas, periodo) {
  let ancla = null;
  for (let i = 0; i < cajas.length; i++) {
    if (cajas[i].periodo < periodo) ancla = cajas[i];
  }
  return ancla;
}

/**
 * Saldo final de una caja cerrada: el congelado, o (cierre legacy sin saldo_final) el derivado de
 * saldo_inicial + total_ingreso - total_egreso.
 * @param {object} caja
 * @returns {number}
 */
function saldoFinalCerrada(caja) {
  if (caja.saldo_final !== null && caja.saldo_final !== undefined) return aEnteroCLP(caja.saldo_final);
  return aEnteroCLP(caja.saldo_inicial) + aEnteroCLP(caja.total_ingreso) - aEnteroCLP(caja.total_egreso);
}

/**
 * Movimiento congelado de una caja cerrada (D-026): saldo_final - saldo_inicial almacenados (conserva
 * ajustes de migracion como la resta del doble conteo); sin saldo_final (cierre legacy) usa
 * total_ingreso - total_egreso.
 * @param {object} caja
 * @returns {number}
 */
function movimientoCongelado(caja) {
  if (caja.saldo_final !== null && caja.saldo_final !== undefined) {
    return aEnteroCLP(caja.saldo_final) - aEnteroCLP(caja.saldo_inicial);
  }
  return aEnteroCLP(caja.total_ingreso) - aEnteroCLP(caja.total_egreso);
}

/**
 * Saldo que una caja traspasa al mes siguiente: cerrada => saldo_final; abierta => saldo_inicial
 * + movimiento en vivo (regla 5: se usa el saldo calculado aunque el mes siga abierto).
 * @param {object} caja
 * @param {object} t
 * @returns {Promise<number>}
 */
async function saldoArrastre(caja, t) {
  if (caja.estado !== CAJA_ABIERTA) return saldoFinalCerrada(caja);
  const mov = await calcularSaldo(caja.periodo, { transaction: t });
  return aEnteroCLP(caja.saldo_inicial) + mov.ingresos - mov.egresos.total;
}

/**
 * Cierra el mes `periodo`: congela saldo_final, encadena saldo_inicial, crea el mes siguiente si no
 * hay meses posteriores y recalcula en cascada si los hay. Todo en una transacción.
 * @param {string} periodo 'YYYY-MM'
 * @param {{usuario: {id: (number|null), contexto: string}, ip?: string}} contexto
 * @returns {Promise<{caja: object, siguiente: (object|null), recalculados: string[]}>}
 */
async function cerrarMes(periodo, contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const cajas = await bloquearCajas(t);
      const caja = cajas.filter(function (c) { return c.periodo === periodo; })[0];
      if (!caja) {
        throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
      }
      if (caja.estado !== CAJA_ABIERTA) {
        throw new AppError('MES_YA_CERRADO', 'la caja de ' + periodo + ' ya esta cerrada', 409, { periodo: periodo });
      }

      const ancla = buscarAncla(cajas, periodo);
      if (ancla && ancla.estado === CAJA_ABIERTA) {
        throw new AppError('MES_ANTERIOR_ABIERTO', 'la caja de ' + ancla.periodo + ' sigue abierta', 409, { periodo: ancla.periodo });
      }

      const centrosAbiertos = await CentroCosto.count({
        where: { cajaId: caja.id, estado: CENTRO_ABIERTO },
        transaction: t
      });
      if (centrosAbiertos > 0) {
        throw new AppError('CENTROS_ABIERTOS', centrosAbiertos + ' centro(s) de costo abiertos en ' + periodo, 409, { periodo: periodo, cantidad: centrosAbiertos });
      }

      // Primer mes conserva su saldo_inicial (regla 2); si no, hereda el saldo final del ancla.
      const saldoInicial = ancla ? saldoFinalCerrada(ancla) : aEnteroCLP(caja.saldo_inicial);
      const mov = await calcularSaldo(periodo, { transaction: t });
      const saldoFinal = saldoInicial + mov.ingresos - mov.egresos.total;

      const antesCaja = caja.get({ plain: true });
      await caja.update(
        {
          estado: CAJA_CERRADA,
          // D-030: la fecha de cierre la fija el servidor (no el cliente), mediodía UTC del día en Santiago.
          fecha_cierre: new Date(fecha.hoySantiago() + 'T12:00:00Z'),
          cerrada_por: usuario.id,
          saldo_inicial: saldoInicial,
          saldo_final: saldoFinal,
          saldo_provisional: false,
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

      const posteriores = cajas.filter(function (c) { return c.periodo > periodo; });
      let siguiente = null;
      let recalculados = [];

      if (!posteriores.length) {
        const periodoSiguiente = desplazarPeriodo(periodo, 1);
        // `cajas.id` no siempre tiene AUTO_INCREMENT (typo historico "autoIncrment" en el modelo):
        // se calcula el siguiente id explicitamente; queda serializado por bloquearCajas.
        const maxId = await Caja.max('id', { transaction: t });
        siguiente = await Caja.create(
          {
            id: (maxId || 0) + 1,
            periodo: periodoSiguiente,
            fecha_inicio: primerDiaDePeriodo(periodoSiguiente),
            estado: CAJA_ABIERTA,
            saldo_inicial: saldoFinal,
            saldo_final: null,
            saldo_provisional: false,
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
      } else {
        // Siempre se propaga el saldo a TODO mes posterior existente (re-cierre tras reapertura, cron).
        const cambios = await recalcularCascada(posteriores[0].periodo, { transaction: t, usuario: usuario, ip: ip, cajas: cajas });
        recalculados = cambios.map(function (r) { return r.periodo; });
        siguiente = posteriores[0];
      }

      return { caja: caja, siguiente: siguiente, recalculados: recalculados };
    });
  }, { incluirDuplicado: true });
}

/**
 * Reabre un mes cerrado (deja `saldo_final`/`fecha_cierre`/`cerrada_por` en NULL). Los meses
 * posteriores no se tocan hasta el re-cierre (que dispara `recalcularCascada` desde `cerrarMes`).
 * @param {string} periodo 'YYYY-MM'
 * @param {{usuario: {id: (number|null), contexto: string}, motivo: string, ip?: string}} contexto
 * @returns {Promise<{caja: object}>}
 */
async function reabrirMes(periodo, contexto) {
  const usuario = contexto.usuario;
  const motivo = contexto.motivo;
  const ip = contexto.ip;

  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }
  if (!motivo) {
    throw new AppError('MOTIVO_REQUERIDO', 'la reapertura de un mes requiere motivo', 400);
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const cajas = await bloquearCajas(t);
      const caja = cajas.filter(function (c) { return c.periodo === periodo; })[0];
      if (!caja) {
        throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
      }
      if (caja.estado === CAJA_ABIERTA) {
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
  }, { incluirDuplicado: true });
}

/**
 * Recalcula saldo_inicial encadenado (y saldo_final de las cerradas, preservando su movimiento
 * congelado) de todas las cajas desde `desdePeriodo` en adelante. Exige la transacción del
 * llamador; si no recibe `cajas` ya bloqueadas, las bloquea (misma consulta ordenada).
 * @param {string} desdePeriodo 'YYYY-MM'
 * @param {{transaction: object, usuario: {id: (number|null), contexto: string}, ip?: string, cajas?: object[]}} contexto
 * @returns {Promise<Array<{periodo: string, saldo_inicial_antes: number, saldo_inicial: number, saldo_final_antes: (number|null), saldo_final: (number|null)}>>}
 *   solo las cajas que cambiaron
 */
async function recalcularCascada(desdePeriodo, contexto) {
  const t = contexto && contexto.transaction;
  if (!t) {
    throw new AppError('TRANSACCION_REQUERIDA', 'recalcularCascada requiere la transaccion del llamador', 500);
  }
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  const motivo = 'CASCADA_DESDE_' + desdePeriodo;

  const todas = contexto.cajas || await bloquearCajas(t);
  const ancla = buscarAncla(todas, desdePeriodo);
  let saldoPrevio = ancla ? await saldoArrastre(ancla, t) : null;
  let hayAbiertaPrevia = !!ancla && ancla.estado === CAJA_ABIERTA;

  const cambiadas = [];
  const resumen = [];
  const cajas = todas.filter(function (c) { return c.periodo >= desdePeriodo; });
  for (let i = 0; i < cajas.length; i++) {
    const caja = cajas[i];
    const antes = caja.get({ plain: true });
    const siAntes = aEnteroCLP(caja.saldo_inicial);
    const sfAntes = caja.saldo_final === null || caja.saldo_final === undefined ? null : aEnteroCLP(caja.saldo_final);

    // Si no hay ancla (primer mes) NO se pone en 0: conserva su saldo_inicial.
    const nuevoSi = saldoPrevio === null ? siAntes : saldoPrevio;
    let nuevoSf = sfAntes;
    const cambios = { saldo_provisional: hayAbiertaPrevia };

    if (caja.estado !== CAJA_ABIERTA) {
      nuevoSf = nuevoSi + movimientoCongelado(caja);
      cambios.saldo_final = nuevoSf;
      saldoPrevio = nuevoSf;
    } else {
      const mov = await calcularSaldo(caja.periodo, { transaction: t });
      saldoPrevio = nuevoSi + mov.ingresos - mov.egresos.total;
      hayAbiertaPrevia = true;
    }
    cambios.saldo_inicial = nuevoSi;

    const cambio = nuevoSi !== siAntes || nuevoSf !== sfAntes || Boolean(caja.saldo_provisional) !== cambios.saldo_provisional;
    if (!cambio) continue;

    await caja.update(cambios, { transaction: t });
    await auditar({
      transaction: t,
      usuario: usuario,
      entidad: 'cajas',
      entidad_id: caja.id,
      accion: 'RECALCULO',
      antes: antes,
      despues: caja,
      motivo: motivo,
      ip: ip
    });
    const fila = { periodo: caja.periodo, saldo_inicial_antes: siAntes, saldo_inicial: nuevoSi, saldo_final_antes: sfAntes, saldo_final: nuevoSf };
    cambiadas.push(fila);
    resumen.push(fila);
  }

  if (resumen.length) {
    await auditar({
      transaction: t,
      usuario: usuario,
      entidad: 'cajas',
      entidad_id: resumen[0].periodo + '..' + resumen[resumen.length - 1].periodo,
      accion: 'RECALCULO_CASCADA',
      antes: null,
      despues: { cajas: resumen },
      motivo: motivo,
      ip: ip
    });
  }

  return cambiadas;
}

module.exports = {
  cerrarMes: cerrarMes,
  reabrirMes: reabrirMes,
  recalcularCascada: recalcularCascada,
  reintentarTransaccion: reintentarTransaccion,
  desplazarPeriodo: desplazarPeriodo,
  primerDiaDePeriodo: primerDiaDePeriodo,
  bloquearCajas: bloquearCajas,
  buscarAncla: buscarAncla,
  saldoArrastre: saldoArrastre,
  saldoFinalCerrada: saldoFinalCerrada,
  movimientoCongelado: movimientoCongelado
};
