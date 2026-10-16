/**
 * RF-CAJA-01 — Lecturas de caja por periodo (resumen e historial). Solo lectura, sin locks.
 * Si un mes tiene saldo provisional o hay un mes anterior abierto, el saldo inicial se recalcula
 * en vivo (cadena desde el primer mes) y se marca provisional, sin persistir nada.
 */

const Caja = require('../../modelos/sistema_base/Caja');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { CAJA_ABIERTA } = require('../constantes');
const { calcularSaldo, aEnteroCLP } = require('./saldo');
const { desplazarPeriodo, saldoFinalCerrada, movimientoCongelado } = require('./cierre');

const MAX_MESES_HISTORIAL = 120;
const MESES_HISTORIAL_DEFECTO = 12;

/**
 * Recorre las cajas (periodo ASC) en memoria y devuelve, por periodo, los valores vigentes.
 * @param {object[]} cajas instancias de `cajas` ordenadas por periodo ASC
 * @param {string} [objetivo] periodo para el que se necesitan también los pendientes
 * @returns {Promise<Object<string, object>>} periodo -> { caja, saldo_inicial, ingresos, egresos, egresos_detalle, saldo_final, provisional, pendientes }
 */
async function construirCadena(cajas, objetivo) {
  const salida = {};
  let running = null;
  let abiertaPrevia = false;

  for (let i = 0; i < cajas.length; i++) {
    const caja = cajas[i];
    const abierta = caja.estado === CAJA_ABIERTA;
    const provisional = abiertaPrevia || Boolean(caja.saldo_provisional);
    const siAlmacenado = aEnteroCLP(caja.saldo_inicial);
    const saldoInicial = provisional && running !== null ? running : siAlmacenado;
    // Las cajas cerradas usan sus totales congelados; solo las abiertas (y el objetivo, por los
    // pendientes) consultan componentes.
    const calculo = abierta || caja.periodo === objetivo
      ? await calcularSaldo(caja.periodo)
      : { ingresos: aEnteroCLP(caja.total_ingreso), egresos: { total: aEnteroCLP(caja.total_egreso) }, pendientes: null };

    let saldoFinal = null;
    if (abierta) {
      running = saldoInicial + calculo.ingresos - calculo.egresos.total;
      abiertaPrevia = true;
    } else {
      // D-026: el movimiento de un mes cerrado es el congelado, nunca el recomputado.
      saldoFinal = provisional
        ? saldoInicial + movimientoCongelado(caja)
        : saldoFinalCerrada(caja);
      running = saldoFinal;
    }

    salida[caja.periodo] = {
      caja: caja,
      saldo_inicial: saldoInicial,
      ingresos: calculo.ingresos,
      egresos: calculo.egresos.total,
      egresos_detalle: calculo.egresos,
      saldo_actual: abierta ? running : saldoFinal,
      saldo_final: saldoFinal,
      provisional: provisional,
      pendientes: calculo.pendientes
    };
  }
  return salida;
}

/**
 * Resumen de caja de un periodo (contrato del frontend: CajaResumen).
 * @param {string} periodo 'YYYY-MM'
 * @returns {Promise<object>}
 */
async function obtenerResumen(periodo) {
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }
  const cajas = await Caja.findAll({ order: [['periodo', 'ASC']] });
  if (!cajas.some(function (c) { return c.periodo === periodo; })) {
    throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
  }
  const hasta = cajas.filter(function (c) { return c.periodo <= periodo; });
  const fila = (await construirCadena(hasta, periodo))[periodo];

  return {
    periodo: periodo,
    caja_id: fila.caja.id,
    estado: fila.caja.estado === CAJA_ABIERTA ? 'ABIERTA' : 'CERRADA',
    // El saldo arrastrado del mes anterior NO es movimiento: va aparte de ingresos/egresos.
    saldo_inicial: fila.saldo_inicial,
    ingresos: fila.ingresos,
    egresos: fila.egresos,
    egresos_detalle: fila.egresos_detalle,
    saldo_actual: fila.saldo_actual,
    saldo_final: fila.saldo_final,
    saldo_provisional: fila.provisional,
    provisional: fila.provisional,
    pendientes: fila.pendientes
  };
}

/**
 * Historial de cajas en el rango [desde, hasta] (por defecto últimos 12 meses; máx. 120).
 * @param {{desde?: string, hasta?: string}} rango
 * @returns {Promise<{items: object[], desde: string, hasta: string}>}
 */
async function obtenerHistorial(rango) {
  const r = rango || {};
  [r.desde, r.hasta].forEach(function (p) {
    if (p !== undefined && !fecha.esPeriodoValido(p)) {
      throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + p, 400, { periodo: p });
    }
  });
  const hasta = r.hasta || fecha.hoySantiago().slice(0, 7);
  const desde = r.desde || desplazarPeriodo(hasta, -(MESES_HISTORIAL_DEFECTO - 1));
  if (desde > hasta) {
    throw new AppError('RANGO_INVALIDO', 'desde debe ser menor o igual a hasta', 400, { desde: desde, hasta: hasta });
  }
  const meses = (Number(hasta.slice(0, 4)) - Number(desde.slice(0, 4))) * 12 + Number(hasta.slice(5)) - Number(desde.slice(5)) + 1;
  if (meses > MAX_MESES_HISTORIAL) {
    throw new AppError('RANGO_INVALIDO', 'el rango maximo es de ' + MAX_MESES_HISTORIAL + ' meses', 400, { desde: desde, hasta: hasta });
  }

  const cajas = await Caja.findAll({ order: [['periodo', 'ASC']] });
  const hastaHasta = cajas.filter(function (c) { return c.periodo <= hasta; });
  const cadena = await construirCadena(hastaHasta);
  const items = hastaHasta
    .filter(function (c) { return c.periodo >= desde; })
    .map(function (c) {
      const f = cadena[c.periodo];
      return {
        periodo: c.periodo,
        estado: c.estado === CAJA_ABIERTA ? 'ABIERTA' : 'CERRADA',
        saldo_inicial: f.saldo_inicial,
        ingresos: f.ingresos,
        egresos: f.egresos,
        saldo_final: f.saldo_final,
        provisional: f.provisional
      };
    });
  return { items: items, desde: desde, hasta: hasta };
}

module.exports = {
  obtenerResumen: obtenerResumen,
  obtenerHistorial: obtenerHistorial
};
