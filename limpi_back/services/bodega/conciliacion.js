/**
 * RF-BOD-06 — Conciliación del kardex valorizado (solo lectura). Función pura: recibe los movimientos con saldo
 * de un producto (orden id ASC) y su productos.stock, y devuelve los hallazgos. La usa scripts/kardex-conciliar.js.
 */

const num = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * @param {object[]} movimientos movimientos_bodega del producto con stock_resultante no nulo, id ASC
 * @param {number|null} stockProducto productos.stock
 * @returns {{tipo:string, movimiento_id:number|null, esperado:number|null, encontrado:number|null}[]}
 */
function conciliarProducto(movimientos, stockProducto) {
  const hallazgos = [];
  const h = (tipo, m, esperado, encontrado) => hallazgos.push({ tipo: tipo, movimiento_id: m ? m.id : null, esperado: esperado, encontrado: encontrado });
  const stock = num(stockProducto) || 0;
  if (!movimientos.length) {
    if (stock !== 0) h('SIN_KARDEX', null, stock, null);
    return hallazgos;
  }
  let previo = null;
  for (const m of movimientos) {
    const sa = num(m.stock_anterior);
    const sr = num(m.stock_resultante);
    const va = num(m.valor_saldo_anterior);
    const vr = num(m.valor_saldo_resultante);
    const vm = num(m.valor_movimiento);
    if (previo && sa !== num(previo.stock_resultante)) h('CADENA_STOCK', m, num(previo.stock_resultante), sa);
    if (previo && va !== num(previo.valor_saldo_resultante)) h('CADENA_VALOR', m, num(previo.valor_saldo_resultante), va);
    if (sr !== sa + num(m.cantidad)) h('ARITMETICA_STOCK', m, sa + num(m.cantidad), sr);
    if (vm === null || vr !== va + vm) h('ARITMETICA_VALOR', m, vm === null ? null : va + vm, vr);
    if (vr < 0) h('VALOR_NEGATIVO', m, 0, vr);
    previo = m;
  }
  if (num(previo.stock_resultante) !== stock) h('DESCUADRE_ACTUAL', previo, stock, num(previo.stock_resultante));
  return hallazgos;
}

module.exports = { conciliarProducto };
