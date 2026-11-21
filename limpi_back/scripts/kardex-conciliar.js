'use strict';

/**
 * RF-BOD-06 — Conciliación del kardex valorizado (solo lectura: SELECT, no corrige nada).
 * Por producto verifica la cadena de saldos (stock y valor), la aritmética de cada movimiento y que el último
 * stock_resultante coincida con productos.stock. Imprime JSON; exit code 1 si hay hallazgos.
 * RF-BOD-04b: además, orden_compra_items.cantidad_recibida (caché) = Σ recepcion_items.cantidad por línea.
 * Uso (desde limpi_back/): node scripts/kardex-conciliar.js [--producto=<id>]
 * Otra BD local: DATABASE_NAME=<bd> node scripts/kardex-conciliar.js
 */

const db = require('../database/database');
const { conciliarProducto } = require('../services/bodega/conciliacion');

db.sequelize.options.logging = false;

const arg = process.argv.filter((a) => a.indexOf('--producto=') === 0)[0];
const PRODUCTO = arg ? Number(arg.split('=')[1]) : null;

async function main() {
  if (arg && !(Number.isSafeInteger(PRODUCTO) && PRODUCTO > 0)) throw new Error('--producto debe ser un entero positivo');
  const SELECT = db.sequelize.QueryTypes.SELECT;
  const filtro = PRODUCTO ? ' AND p.id = :producto' : '';
  const productos = await db.sequelize.query('SELECT p.id, p.nombre, p.stock FROM productos p WHERE 1 = 1' + filtro + ' ORDER BY p.id',
    { replacements: { producto: PRODUCTO }, type: SELECT });
  const movimientos = await db.sequelize.query(
    'SELECT m.id, m.producto_id, m.cantidad, m.stock_anterior, m.stock_resultante, m.valor_movimiento, ' +
    'm.valor_saldo_anterior, m.valor_saldo_resultante FROM movimientos_bodega m ' +
    'WHERE m.stock_resultante IS NOT NULL' + (PRODUCTO ? ' AND m.producto_id = :producto' : '') + ' ORDER BY m.producto_id, m.id',
    { replacements: { producto: PRODUCTO }, type: SELECT });

  const porProducto = movimientos.reduce((acc, m) => { (acc[m.producto_id] = acc[m.producto_id] || []).push(m); return acc; }, {});
  const conHallazgos = [];
  const resumen = {};
  for (const p of productos) {
    const hallazgos = conciliarProducto(porProducto[p.id] || [], p.stock);
    if (!hallazgos.length) continue;
    hallazgos.forEach((x) => { resumen[x.tipo] = (resumen[x.tipo] || 0) + 1; });
    conHallazgos.push({ producto_id: p.id, producto: p.nombre, stock: p.stock, hallazgos: hallazgos });
  }
  const recepcionesDescuadradas = await db.sequelize.query(
    'SELECT i.id AS item_id, i.orden_id, i.producto_id, i.cantidad_recibida, COALESCE(SUM(ri.cantidad), 0) AS recibido_en_recepciones ' +
    'FROM orden_compra_items i LEFT JOIN recepcion_items ri ON ri.orden_item_id = i.id ' +
    'WHERE 1 = 1' + (PRODUCTO ? ' AND i.producto_id = :producto' : '') + ' ' +
    'GROUP BY i.id, i.orden_id, i.producto_id, i.cantidad_recibida HAVING i.cantidad_recibida <> COALESCE(SUM(ri.cantidad), 0) ORDER BY i.id',
    { replacements: { producto: PRODUCTO }, type: SELECT });
  console.log(JSON.stringify({
    base_datos: db.sequelize.config.database,
    productos_revisados: productos.length,
    movimientos_revisados: movimientos.length,
    productos_con_hallazgos: conHallazgos.length,
    resumen: resumen,
    detalle: conHallazgos,
    lineas_oc_descuadradas: recepcionesDescuadradas
  }, null, 2));
  if (conHallazgos.length || recepcionesDescuadradas.length) process.exitCode = 1;
}

main()
  .then(() => db.sequelize.close())
  .catch((err) => {
    console.error('[RF-BOD-06] conciliación falló: ' + err.message);
    process.exitCode = 2;
    return db.sequelize.close();
  });
