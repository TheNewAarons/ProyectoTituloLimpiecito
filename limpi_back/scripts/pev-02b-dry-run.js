'use strict';

/**
 * RF-PEV-02b — Dry-run de M2 (solo lectura): imprime en JSON el plan (K y exclusiones por motivo),
 * los conteos de control K y el tiempo medido. No escribe nada (solo SELECT; la transacción hace rollback).
 * Uso (desde limpi_back/): node scripts/pev-02b-dry-run.js
 * Otra BD local: DATABASE_NAME=<bd> node scripts/pev-02b-dry-run.js (dotenv no pisa variables ya definidas).
 */

const db = require('../database/database');
const backfill = require('../services/pev/backfill');

db.sequelize.options.logging = false;

async function main() {
  const inicio = Date.now();
  const t = await db.sequelize.transaction();
  try {
    const plan = await backfill.planificar(db.sequelize, { transaction: t });
    const msPlan = Date.now() - inicio;
    const controles = await backfill.controles(db.sequelize, { transaction: t });
    console.log(JSON.stringify({
      base_datos: db.sequelize.config.database,
      ms_planificar: msPlan,
      ms_total: Date.now() - inicio,
      plan: plan.resumen,
      controles: controles
    }, null, 2));
  } finally {
    await t.rollback();
  }
}

main()
  .then(() => db.sequelize.close())
  .catch((err) => {
    console.error('[RF-PEV-02b] dry-run falló: ' + err.message);
    process.exitCode = 1;
    return db.sequelize.close();
  });
