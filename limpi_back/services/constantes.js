/**
 * RF-CAJA-02/RF-CAJA-01 — Constantes compartidas entre services/caja y services/liquidaciones
 * (TASK_PLAN §0 D-004/D-006; valores confirmados en P0 sobre el clon local, pendiente re-chequeo
 * en una copia de producción antes del despliegue).
 */

module.exports = {
  CAJA_ABIERTA: 1,
  CAJA_CERRADA: 0,
  EGRESO_ANULADO: -1,
  EGRESO_TIPO_LIQUIDACION: 2
};
