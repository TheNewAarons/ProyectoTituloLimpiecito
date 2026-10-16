/**
 * RF-CAJA-01 — Búsqueda de caja por periodo (TASK_PLAN §1). Fase B: usa `cajas.periodo`
 * (columna UNIQUE agregada por la migración 20261016041620-RF-CAJA-01-periodo-saldos-cajas.js).
 */

const Caja = require('../../modelos/sistema_base/Caja');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');

/**
 * Busca la caja de un periodo 'YYYY-MM'.
 * @param {string} periodo 'YYYY-MM'
 * @param {{transaction?: object, lock?: (string|boolean|null)}} [opciones]
 * @returns {Promise<object|null>} instancia `cajas` o null si no existe
 */
async function buscarCajaPorPeriodo(periodo, opciones) {
  const o = opciones || {};
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }
  const query = { where: { periodo: periodo } };
  if (o.transaction) query.transaction = o.transaction;
  if (o.lock) query.lock = o.lock;
  return Caja.findOne(query);
}

module.exports = {
  buscarCajaPorPeriodo: buscarCajaPorPeriodo
};
