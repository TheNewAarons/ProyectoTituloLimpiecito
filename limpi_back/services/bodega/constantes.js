// RF-BOD-01 — Constantes de bodega. Estados según la spec §7; la UI agrupa PARCIAL y LISTA_ENTREGA como "En proceso".
const { ROL_ADMIN_NOMBRES } = require('../constantes');

const ESTADOS_SOLICITUD = {
  PENDIENTE: 'PENDIENTE',
  PARCIAL: 'PARCIAL',
  LISTA_ENTREGA: 'LISTA_ENTREGA',
  ENTREGADA: 'ENTREGADA',
  ANULADA: 'ANULADA'
};

module.exports = {
  ESTADOS_SOLICITUD,
  // Etiqueta para la UI (Jira SCRUM-8: Pendiente / En proceso / Entregada).
  ETIQUETA_ESTADO: {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'En proceso',
    LISTA_ENTREGA: 'En proceso',
    ENTREGADA: 'Entregada',
    ANULADA: 'Anulada'
  },
  // accesos_laborales.tipo: 0 = Trabajador General, 1 = Trabajador y Supervisor (ver-trabajador.component.ts).
  TIPO_ACCESO_SUPERVISOR: 1,
  // Producto activo (productos.estado).
  PRODUCTO_ACTIVO: 1,
  CENTRO_ABIERTO: 1,
  // Admin/Dueño + Subjefe de Operaciones (spec §2.3). Nombre de Operaciones pendiente de confirmar en `roles`.
  ROL_BODEGA_ADMIN_NOMBRES: ROL_ADMIN_NOMBRES.concat([])
};
