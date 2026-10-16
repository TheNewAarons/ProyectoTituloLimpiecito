/**
 * RF-CAJA-02/RF-CAJA-01 — Constantes compartidas entre services/caja y services/liquidaciones
 * (TASK_PLAN §0 D-004/D-006; valores confirmados en P0 sobre el clon local, pendiente re-chequeo
 * en una copia de producción antes del despliegue).
 */

module.exports = {
  CAJA_ABIERTA: 1,
  CAJA_CERRADA: 0,
  EGRESO_ANULADO: -1,
  EGRESO_TIPO_LIQUIDACION: 2,
  // RF-CAJA-02 — Nombres de rol (tabla `roles`.`nombre`) para la matriz de permisos (spec §2.3).
  // Confirmado en BD local (aseolimp_minda_oficial09): id 1 = 'Administrador'. El rol RRHH
  // (Yocy) no existe todavia en esa BD local; se deja una lista configurable con el nombre mas
  // probable segun el spec. Revisar/ajustar antes de habilitar el flujo en un ambiente con el
  // rol real creado (TASK_PLAN).
  ROL_ADMIN_NOMBRES: ['Administrador'],
  ROL_RRHH_NOMBRES: ['RRHH', 'Recursos Humanos']
};
