/**
 * RF-CAJA-01 — Fachada del módulo de caja (TASK_PLAN §1).
 */

const { buscarCajaPorPeriodo } = require('./periodo');
const { calcularSaldo, aEnteroCLP, finDePeriodo } = require('./saldo');
const { cerrarMes, reabrirMes, recalcularCascada, reintentarTransaccion, desplazarPeriodo } = require('./cierre');

module.exports = {
  buscarCajaPorPeriodo: buscarCajaPorPeriodo,
  calcularSaldo: calcularSaldo,
  aEnteroCLP: aEnteroCLP,
  finDePeriodo: finDePeriodo,
  cerrarMes: cerrarMes,
  reabrirMes: reabrirMes,
  recalcularCascada: recalcularCascada,
  reintentarTransaccion: reintentarTransaccion,
  desplazarPeriodo: desplazarPeriodo
};
