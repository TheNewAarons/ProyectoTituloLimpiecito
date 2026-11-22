'use strict';

/**
 * QA-01 T6 — Huella (COUNT + SUM + CRC32 por fila) de lo que una migración NO debe tocar: cajas cerradas, pagos
 * (cc_ingresos, cc_egresos, egresos, liquidaciones) y movimientos_bodega históricos. Solo lectura; imprime JSON.
 * Se corre antes y después de db:migrate (o undo + migrate) sobre una COPIA: las dos salidas deben ser iguales.
 * SALDO_INICIAL se excluye: lo crea (y lo borra en down) la migración RF-BOD-06, no es dato histórico.
 * Uso (desde limpi_back/): DATABASE_NAME=<copia> node scripts/qa01-checksum.js
 */

const db = require('../database/database');

db.sequelize.options.logging = false;

const CONSULTAS = [
  ['cajas_cerradas', 'COALESCE(SUM(total_ingreso), 0) + COALESCE(SUM(total_egreso), 0) + COALESCE(SUM(saldo_final), 0)',
    "CONCAT_WS('|', id, periodo, fecha_cierre, saldo_inicial, saldo_final, cerrada_por)", 'cajas WHERE fecha_cierre IS NOT NULL'],
  ['cc_ingresos', 'COALESCE(SUM(monto), 0)', "CONCAT_WS('|', id, monto, estado_pago)", 'cc_ingresos'],
  ['cc_egresos', 'COALESCE(SUM(monto), 0)', "CONCAT_WS('|', id, monto, estado_pago)", 'cc_egresos'],
  ['egresos', 'COALESCE(SUM(monto), 0)', "CONCAT_WS('|', id, monto, estado, estado_pago)", 'egresos'],
  ['liquidaciones', 'COALESCE(SUM(total_pago), 0)', "CONCAT_WS('|', id, total_pago, estado, estado_pago)", 'liquidaciones'],
  ['movimientos_bodega', 'COALESCE(SUM(cantidad), 0)',
    "CONCAT_WS('|', id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, created_at)", "movimientos_bodega WHERE tipo <> 'SALDO_INICIAL'"]
];

async function main() {
  const huella = {};
  for (const [tabla, suma, fila, desde] of CONSULTAS) {
    // Texto fijo del script (sin entrada de usuario): no hay nada que parametrizar.
    const [r] = await db.sequelize.query('SELECT COUNT(*) AS filas, ' + suma + ' AS suma, COALESCE(SUM(CRC32(' + fila + ')), 0) AS huella FROM ' + desde,
      { type: db.sequelize.QueryTypes.SELECT });
    huella[tabla] = { filas: Number(r.filas), suma: Number(r.suma), huella: Number(r.huella) };
  }
  console.log(JSON.stringify({ base_datos: db.sequelize.config.database, huella: huella }, null, 2));
}

main()
  .then(() => db.sequelize.close())
  .catch((err) => {
    console.error('[QA-01] checksum falló: ' + err.message);
    process.exitCode = 2;
    return db.sequelize.close();
  });
