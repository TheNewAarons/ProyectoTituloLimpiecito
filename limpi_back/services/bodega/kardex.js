/**
 * RF-BOD-06 — Kardex valorizado (Docs/DECISIONES.md D-175, D-176). Único punto que mueve productos.stock.
 * Corre DENTRO de la transacción del llamador y con el producto ya bloqueado (FOR UPDATE, id ASC):
 * no abre transacción ni vuelve a bloquear.
 * Valorización: costo promedio ponderado móvil derivado de valor_saldo / stock, montos CLP enteros.
 */

const Sequelize = require('sequelize');

const Op = Sequelize.Op;

const Movimiento = require('../../modelos/sistema_bodega/Movimiento_bodega');
const AppError = require('../../libs/app-error');
const { TIPOS_MOVIMIENTO: M } = require('./constantes');

const USUARIO_SISTEMA = { id: null, contexto: 'SISTEMA' };
const MOTIVO_DESCUADRE = 'Descuadre detectado: stock modificado fuera del kardex';

const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const nulo = (v) => v === null || v === undefined;

// Sin saldo valorizado: último costo de compra o, si no hay, productos.precio (mismo criterio que entrega.js).
function costoReferencia(producto) {
  if (!nulo(producto.costo_unitario)) return Math.round(numero(producto.costo_unitario));
  return Math.round(numero(producto.precio));
}

function costoPromedio(stock, valor, producto) {
  return stock > 0 && valor > 0 ? Math.round(valor / stock) : costoReferencia(producto);
}

/**
 * Valoriza un movimiento con CPP (D-176). Función pura.
 * Entrada: valor = cantidad × costo. Salida: valor = ROUND(cantidad × valor_saldo / stock); si deja el stock
 * en 0 o menos se lleva todo el valor remanente, y sin stock ni valor positivos sale a costo 0.
 * @returns {{costo_unitario:number, valor_movimiento:number, valor_saldo_resultante:number}}
 */
function valorizar(stock, valor, cantidad, costoEntrada) {
  if (cantidad >= 0) {
    const costo = Math.round(numero(costoEntrada));
    return { costo_unitario: costo, valor_movimiento: cantidad * costo, valor_saldo_resultante: valor + cantidad * costo };
  }
  const sale = -cantidad;
  let v = 0;
  if (stock > 0 && valor > 0) v = sale >= stock ? valor : Math.round(sale * valor / stock);
  return { costo_unitario: Math.round(v / sale), valor_movimiento: v ? -v : 0, valor_saldo_resultante: valor - v };
}

// Lectura bloqueante (QA-01 T1b): en REPEATABLE READ una lectura simple ve el snapshot previo al lock del producto
// y omite los movimientos de transacciones concurrentes ya confirmadas -> AJUSTE de descuadre fantasma.
async function ultimoSaldo(productoId, t) {
  const m = await Movimiento.findOne({
    where: { producto_id: productoId, stock_resultante: { [Op.ne]: null } }, order: [['id', 'DESC']], transaction: t,
    lock: Sequelize.Transaction.LOCK.SHARE
  });
  return m && !nulo(m.stock_resultante) ? { stock: numero(m.stock_resultante), valor: numero(m.valor_saldo_resultante) } : null;
}

async function insertar(datos, t) {
  return Movimiento.create(datos, { transaction: t });
}

/**
 * Registra un movimiento valorizado y aplica el delta a productos.stock.
 * Si el stock del producto no coincide con el último saldo del kardex (escritor legacy fuera del kardex),
 * primero deja un AJUSTE de descuadre para que la cadena de saldos siga siendo reconstruible.
 * @param {object} o
 * @param {object} o.transaction transacción activa
 * @param {object} o.producto instancia Producto bloqueada FOR UPDATE
 * @param {string} o.tipo TIPOS_MOVIMIENTO
 * @param {number} o.cantidad delta con signo (entero ≠ 0)
 * @param {number} [o.costoUnitario] costo de una entrada; sin él se usa el promedio vigente
 * @param {object} [o.revierte] movimiento original: la reversa usa su mismo valor (costo congelado)
 * @param {string} [o.referenciaTipo]
 * @param {number} [o.referenciaId]
 * @param {number} [o.referenciaLineaId]
 * @param {string} [o.motivo]
 * @param {{id:number, contexto:string}} o.usuario
 * @returns {Promise<object>} el movimiento creado
 */
async function registrar(o) {
  const t = o.transaction;
  const producto = o.producto;
  const cantidad = Number(o.cantidad);
  if (!Number.isSafeInteger(cantidad) || cantidad === 0) {
    throw new AppError('CANTIDAD_INVALIDA', 'la cantidad del movimiento debe ser un entero distinto de 0', 500, { cantidad: o.cantidad });
  }
  if (o.revierte && Number(o.revierte.cantidad) !== -cantidad) {
    throw new AppError('REVERSA_INVALIDA', 'la reversa debe tener la cantidad opuesta al movimiento original', 500, { movimiento_id: o.revierte.id });
  }

  const stockReal = numero(producto.stock);
  let saldo = await ultimoSaldo(producto.id, t);
  const stockKardex = saldo ? saldo.stock : 0;
  if (stockReal !== stockKardex) {
    const delta = stockReal - stockKardex;
    const valorKardex = saldo ? saldo.valor : 0;
    const v = valorizar(stockKardex, valorKardex, delta, costoPromedio(stockKardex, valorKardex, producto));
    await insertar(Object.assign({
      producto_id: producto.id, tipo: saldo ? M.AJUSTE : M.SALDO_INICIAL, cantidad: delta,
      usuario_id: USUARIO_SISTEMA.id, contexto_usuario: USUARIO_SISTEMA.contexto,
      stock_anterior: stockKardex, stock_resultante: stockReal, valor_saldo_anterior: valorKardex,
      motivo: saldo ? MOTIVO_DESCUADRE : 'Saldo inicial del producto'
    }, v), t);
    saldo = { stock: stockReal, valor: v.valor_saldo_resultante };
  }
  const valorAnterior = saldo ? saldo.valor : 0;

  let v;
  if (o.revierte && !nulo(o.revierte.valor_movimiento)) {
    const valorMov = -numero(o.revierte.valor_movimiento);
    v = { costo_unitario: numero(o.revierte.costo_unitario), valor_movimiento: valorMov, valor_saldo_resultante: valorAnterior + valorMov };
  } else {
    const costo = cantidad > 0 && !nulo(o.costoUnitario) ? o.costoUnitario : costoPromedio(stockReal, valorAnterior, producto);
    v = valorizar(stockReal, valorAnterior, cantidad, costo);
  }

  const stockResultante = stockReal + cantidad;
  await producto.update({ stock: stockResultante }, { transaction: t });
  return insertar(Object.assign({
    producto_id: producto.id, tipo: o.tipo, cantidad: cantidad,
    referencia_tipo: o.referenciaTipo || null, referencia_id: nulo(o.referenciaId) ? null : o.referenciaId,
    referencia_linea_id: nulo(o.referenciaLineaId) ? null : o.referenciaLineaId,
    movimiento_revertido_id: o.revierte ? o.revierte.id : null, motivo: o.motivo || null,
    usuario_id: o.usuario.id, contexto_usuario: o.usuario.contexto,
    stock_anterior: stockReal, stock_resultante: stockResultante, valor_saldo_anterior: valorAnterior
  }, v), t);
}

module.exports = { registrar, valorizar, costoReferencia };
