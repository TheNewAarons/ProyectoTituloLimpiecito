/**
 * RNF-ARQ-01 (cierre D-ARQ-01-1) — Anular una entrada de stock rápido: reemplaza el borrado físico del legacy
 * (DELETE /stock/eliminar). En una transacción: marca la fila como anulada, descuenta su cantidad con una REVERSA
 * enlazada al ENTRADA_MANUAL original (costo congelado) y audita. Archivo aparte para no tocar stock-rapido.js.
 */

const Sequelize = require('sequelize');
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const db = require('../../database/database');
const Producto = require('../../modelos/sistema_base/Producto');
const Stock = require('../../modelos/sistema_base/Stock_rapido');
const Movimiento = require('../../modelos/sistema_bodega/Movimiento_bodega');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const kardex = require('./kardex');
const { TIPOS_MOVIMIENTO: M } = require('./constantes');

const LARGO_MOTIVO = 255;

function normalizarMotivo(motivo) {
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  if (m.length < 3 || m.length > LARGO_MOTIVO) {
    throw new AppError('CAMPO_INVALIDO', 'el motivo es obligatorio (3 a ' + LARGO_MOTIVO + ' caracteres)', 400, { campo: 'motivo' });
  }
  return m;
}

/**
 * @param {number} id stock_rapidos.id
 * @param {string} motivo obligatorio
 * @param {{usuario:{id:number, contexto:string}, ip:string, motivoSinToken?:string}} ctx
 */
async function anular(id, motivo, ctx) {
  const m = normalizarMotivo(motivo);
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const stock = await Stock.findById(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!stock) throw new AppError('NO_ENCONTRADO', 'la entrada de stock rápido no existe', 404, { id: id });
      if (stock.anulada_at) throw new AppError('YA_ANULADA', 'la entrada de stock rápido ya está anulada', 409, { id: id, anulada_at: stock.anulada_at });
      const antes = Object.assign({}, stock.get({ plain: true }));

      const producto = await Producto.findOne({ where: { id: stock.productoId }, lock: t.LOCK.UPDATE, transaction: t });
      if (!producto) throw new AppError('PRODUCTO_NO_DISPONIBLE', 'el producto de la entrada no existe', 409, { producto_id: stock.productoId });
      const cantidad = Number(stock.cantidad) || 0;
      const stockPrevio = Number(producto.stock) || 0;
      // Si lo ingresado ya se consumió, anular dejaría stock negativo: se corrige con un conteo físico (RF-BOD-07).
      if (stockPrevio < cantidad) {
        throw new AppError('STOCK_INSUFICIENTE', 'el stock actual es menor que la cantidad de la entrada; corrija con un conteo físico', 409,
          { producto_id: producto.id, stock_actual: stockPrevio, cantidad: cantidad });
      }

      let movimiento = null;
      if (cantidad > 0) {
        const original = await Movimiento.findOne({
          where: { referencia_tipo: 'stock_rapidos', referencia_id: stock.id, tipo: M.ENTRADA_MANUAL }, order: [['id', 'ASC']], transaction: t
        });
        movimiento = await kardex.registrar({
          transaction: t, producto: producto, cantidad: -cantidad, usuario: ctx.usuario,
          // Entrada anterior al kardex (sin ENTRADA_MANUAL): no hay movimiento que revertir, queda como AJUSTE explícito.
          tipo: original ? M.REVERSA : M.AJUSTE, revierte: original || undefined,
          referenciaTipo: 'stock_rapidos', referenciaId: stock.id,
          motivo: (original ? 'Anulación de stock rápido: ' : 'Anulación de stock rápido sin entrada en kardex: ') + m
        });
      }

      await stock.update({
        anulada_at: new Date(), anulada_por: ctx.usuario.id, contexto_anulacion: ctx.usuario.contexto, motivo_anulacion: m
      }, { transaction: t });
      await auditar({
        transaction: t, usuario: ctx.usuario, entidad: 'stock_rapidos', entidad_id: stock.id, accion: 'ANULAR',
        antes: antes, despues: stock, ip: ctx.ip, motivo: ctx.motivoSinToken || m
      });
      await auditar({
        transaction: t, usuario: ctx.usuario, entidad: 'productos', entidad_id: producto.id, accion: 'AJUSTE',
        antes: { id: producto.id, stock: stockPrevio }, despues: { id: producto.id, stock: stockPrevio - cantidad }, ip: ctx.ip, motivo: ctx.motivoSinToken
      });
      return {
        id: stock.id, anulada_at: stock.anulada_at, motivo_anulacion: m, movimiento_id: movimiento ? movimiento.id : null,
        producto: { id: producto.id, stock: stockPrevio - cantidad }
      };
    });
  });
}

module.exports = { anular: anular, normalizarMotivo: normalizarMotivo, LARGO_MOTIVO: LARGO_MOTIVO };
