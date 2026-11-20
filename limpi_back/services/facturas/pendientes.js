/**
 * RF-FAC-01 / RF-BI-01 — Totales informativos de documentos PENDIENTES (fuera del saldo de caja).
 * Agrega con COUNT/SUM en BD (sin traer filas a memoria). Compartido por /facturas/resumen y BI.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require('../../database/database');
const CcIngreso = require('../../modelos/sistema_base/CcIngreso');
const Egreso = require('../../modelos/sistema_base/Egreso');
const CcEgreso = require('../../modelos/sistema_base/CcEgreso');
const { EGRESO_ANULADO } = require('../constantes');

/**
 * @param {object} modelo
 * @param {object} where
 * @returns {Promise<{cantidad: number, monto: number}>}
 */
async function agregar(modelo, where) {
  const filas = await modelo.findAll({
    where: where,
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'cantidad'],
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('monto')), 0), 'monto']
    ],
    raw: true
  });
  const f = filas[0] || {};
  return { cantidad: Number(f.cantidad || 0), monto: Number(f.monto || 0) };
}

/**
 * @param {{periodo?: string}} [opciones] periodo 'YYYY-MM' filtra por fecha_emision
 * @returns {Promise<{por_cobrar: {cantidad: number, monto_total: number}, por_pagar: {cantidad: number, monto_total: number}}>}
 */
async function resumenPendientes(opciones) {
  const periodo = opciones && opciones.periodo;
  const where = { estado_pago: 'PENDIENTE' };
  if (periodo) where[Op.and] = [db.sequelize.where(db.sequelize.fn('DATE_FORMAT', db.sequelize.col('fecha_emision'), '%Y-%m'), periodo)];
  // egresos legacy pueden tener estado NULL: `<> -1` solo los excluiria
  const whereEgreso = Object.assign({}, where, { [Op.or]: [{ estado: null }, { estado: { [Op.ne]: EGRESO_ANULADO } }] });

  const [ingresos, egresosCaja, egresosCc] = await Promise.all([
    agregar(CcIngreso, where),
    agregar(Egreso, whereEgreso),
    agregar(CcEgreso, where)
  ]);
  return {
    por_cobrar: { cantidad: ingresos.cantidad, monto_total: ingresos.monto },
    por_pagar: { cantidad: egresosCaja.cantidad + egresosCc.cantidad, monto_total: egresosCaja.monto + egresosCc.monto }
  };
}

module.exports = { resumenPendientes: resumenPendientes };
