'use strict';

/**
 * RF-PEV-02b — M2: backfill de actividades y asignaciones desde el historial PEV (TASK_PLAN
 * "RF-PEV-02 — Diseño final" §2.1/§2.2, D-112…D-121). Wrapper fino sobre services/pev/backfill.js.
 * - up: crea pev_backfill_log (autocommit) y aplica en UNA transacción global READ_COMMITTED; solo
 *   llena tareas.actividadId / linea_lista_*.asignacionId donde son NULL. Idempotente.
 * - down: aborta sin cambios si hubo uso posterior (vínculos fuera del log, asignaciones BACKFILL
 *   modificadas); si no, vuelve a NULL lo registrado, borra solo lo creado por M2 y elimina el log.
 * Desplegar con el proceso Node detenido (L4) y en la misma ventana que el dual-write (D-121).
 */

const backfill = require('../services/pev/backfill');

module.exports = {
  up: async (queryInterface) => {
    const r = await backfill.aplicar(queryInterface.sequelize);
    console.log('[RF-PEV-02b] up lote=' + r.lote + ' filas_log=' + r.filas_log + ' resumen=' + JSON.stringify(r.resumen));
  },

  down: async (queryInterface) => {
    const r = await backfill.revertir(queryInterface.sequelize);
    console.log('[RF-PEV-02b] down ' + JSON.stringify(r));
  }
};
