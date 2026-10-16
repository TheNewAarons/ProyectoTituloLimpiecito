/**
 * RF-CAJA-01 — Cálculo de saldo de caja (TASK_PLAN §1). Regla "solo pagados impactan caja, en el
 * mes de fecha_pago": no se usa `centro_costos.total_costos` (lo calcula el front e incluye todas
 * las liquidaciones -> doble conteo, H2). Solo lectura.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const CentroCosto = require('../../modelos/sistema_base/Centro_costo');
const Egreso = require('../../modelos/sistema_base/Egreso');
const CcEgreso = require('../../modelos/sistema_base/CcEgreso');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const CentroCostoTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');

const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { buscarCajaPorPeriodo } = require('./periodo');
const { CAJA_CERRADA, EGRESO_ANULADO } = require('../constantes');

const CENTRO_CERRADO = 0;

/**
 * Convierte un monto DECIMAL/INTEGER (mysql2 puede devolver string) a entero CLP seguro.
 * @param {number|string|null} valor
 * @returns {number} entero CLP; 0 si valor es null/undefined
 */
function aEnteroCLP(valor) {
  if (valor === null || valor === undefined) return 0;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) {
    throw new AppError('MONTO_INVALIDO', 'monto no es un entero seguro: ' + valor, 422, { valor: valor });
  }
  return numero;
}

/**
 * Convierte el resultado de `Model.sum(...)` a entero CLP. Sequelize v4 devuelve `NaN` (no
 * `null`) cuando la agregación no tiene filas que coincidan; se trata igual que "sin monto" (0).
 * @param {number|string|null} valorSum resultado de `Model.sum(...)`
 * @returns {number}
 */
function sumEnteroCLP(valorSum) {
  if (typeof valorSum === 'number' && isNaN(valorSum)) return 0;
  return aEnteroCLP(valorSum);
}

/**
 * Última fecha/hora ('YYYY-MM-DD 23:59:59') del periodo, para comparar `fecha_creacion`.
 * @param {string} periodo 'YYYY-MM'
 * @returns {string}
 */
function finDePeriodo(periodo) {
  const partes = periodo.split('-');
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const diaStr = ultimoDia < 10 ? '0' + ultimoDia : String(ultimoDia);
  return periodo + '-' + diaStr + ' 23:59:59';
}

/**
 * IDs de centro_costos cerrados (estado=0) de una caja.
 * @param {number} cajaId
 * @param {object} [transaction]
 * @returns {Promise<number[]>}
 */
async function idsCentrosCerrados(cajaId, transaction) {
  const centros = await CentroCosto.findAll({
    where: { cajaId: cajaId, estado: CENTRO_CERRADO },
    attributes: ['id'],
    transaction: transaction
  });
  return centros.map(function (c) { return c.id; });
}

/**
 * Suma de liquidaciones históricas (PAGADA, sin egreso_id) de los centros cerrados de la caja.
 * @param {number[]} centroIds
 * @param {object} [transaction]
 * @returns {Promise<number>}
 */
async function sumarLiquidacionesHistoricas(centroIds, transaction) {
  if (!centroIds.length) return 0;
  const vinculos = await CentroCostoTrabajador.findAll({
    where: { centroCostoId: { [Op.in]: centroIds } },
    attributes: ['liquidacioneId'],
    transaction: transaction
  });
  const liquidacionIds = vinculos
    .map(function (v) { return v.liquidacioneId; })
    .filter(function (id) { return id !== null && id !== undefined; });
  if (!liquidacionIds.length) return 0;
  const total = await Liquidacion.sum('liquido_pagar', {
    where: {
      id: { [Op.in]: liquidacionIds },
      estado_pago: 'PAGADA',
      egreso_id: null
    },
    transaction: transaction
  });
  return sumEnteroCLP(total);
}

/**
 * Calcula el saldo de un periodo de caja. Si la caja está CERRADA, devuelve el movimiento congelado
 * (no se recalcula salvo reapertura explícita); si está ABIERTA, calcula en vivo (provisional=true).
 * @param {string} periodo 'YYYY-MM'
 * @param {{transaction?: object}} [opciones]
 * @returns {Promise<object>} { periodo, cajaId, estado, saldo_inicial, ingresos, egresos, saldo_final, provisional, pendientes }
 */
async function calcularSaldo(periodo, opciones) {
  const o = opciones || {};
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }
  const caja = await buscarCajaPorPeriodo(periodo, { transaction: o.transaction });
  if (!caja) {
    throw new AppError('CAJA_NO_EXISTE', 'no existe caja para el periodo ' + periodo, 404, { periodo: periodo });
  }

  const pendientesLiquidaciones = await Liquidacion.findAll({
    where: {
      estado_pago: 'EN_ESPERA',
      fecha_creacion: { [Op.lte]: finDePeriodo(periodo) }
    },
    attributes: ['liquido_pagar'],
    transaction: o.transaction
  });
  const pendientes = {
    cantidad: pendientesLiquidaciones.length,
    monto: pendientesLiquidaciones.reduce(function (acc, l) { return acc + aEnteroCLP(l.liquido_pagar); }, 0)
  };

  if (caja.estado === CAJA_CERRADA) {
    return {
      periodo: periodo,
      cajaId: caja.id,
      estado: caja.estado,
      saldo_inicial: aEnteroCLP(caja.saldo_inicial),
      ingresos: aEnteroCLP(caja.total_ingreso),
      egresos: {
        generales: null,
        centros: null,
        liquidaciones_historicas: null,
        total: aEnteroCLP(caja.total_egreso)
      },
      saldo_final: caja.saldo_final === null ? null : aEnteroCLP(caja.saldo_final),
      provisional: false,
      pendientes: pendientes
    };
  }

  const ingresos = sumEnteroCLP(
    await CentroCosto.sum('precio_servicio', {
      where: { cajaId: caja.id, estado: CENTRO_CERRADO },
      transaction: o.transaction
    })
  );

  const egresosGenerales = sumEnteroCLP(
    await Egreso.sum('monto', {
      where: { cajaId: caja.id, estado: { [Op.ne]: EGRESO_ANULADO } },
      transaction: o.transaction
    })
  );

  const centroIds = await idsCentrosCerrados(caja.id, o.transaction);
  const egresosCentros = centroIds.length
    ? sumEnteroCLP(
        await CcEgreso.sum('monto', {
          where: { centroCostoId: { [Op.in]: centroIds } },
          transaction: o.transaction
        })
      )
    : 0;

  const egresosLiquidacionesHistoricas = await sumarLiquidacionesHistoricas(centroIds, o.transaction);

  const egresosTotal = egresosGenerales + egresosCentros + egresosLiquidacionesHistoricas;
  const saldoInicial = aEnteroCLP(caja.saldo_inicial);
  const saldoFinal = saldoInicial + ingresos - egresosTotal;

  return {
    periodo: periodo,
    cajaId: caja.id,
    estado: caja.estado,
    saldo_inicial: saldoInicial,
    ingresos: ingresos,
    egresos: {
      generales: egresosGenerales,
      centros: egresosCentros,
      liquidaciones_historicas: egresosLiquidacionesHistoricas,
      total: egresosTotal
    },
    saldo_final: saldoFinal,
    provisional: true,
    pendientes: pendientes
  };
}

module.exports = {
  calcularSaldo: calcularSaldo,
  aEnteroCLP: aEnteroCLP,
  finDePeriodo: finDePeriodo
};
