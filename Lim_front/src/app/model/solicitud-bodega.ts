// MODELOS E INTERFACES DE SOLICITUDES DE BODEGA (RF-BOD-01). Contrato: /api/v1/bodega (Docs/bodega-solicitudes.md)

export type EstadoSolicitud = 'PENDIENTE' | 'PARCIAL' | 'LISTA_ENTREGA' | 'ENTREGADA' | 'ANULADA';

// Opciones del filtro: "En proceso" agrupa PARCIAL y LISTA_ENTREGA (Jira SCRUM-8)
export const FILTROS_ESTADO: { valor: string, nombre: string }[] = [
  { valor: '', nombre: 'Todas' },
  { valor: 'PENDIENTE', nombre: 'Pendiente' },
  { valor: 'PARCIAL,LISTA_ENTREGA', nombre: 'En proceso' },
  { valor: 'ENTREGADA', nombre: 'Entregada' },
  { valor: 'ANULADA', nombre: 'Anulada' }
];

export const ETIQUETA_ESTADO: { [estado: string]: string } = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'En proceso',
  LISTA_ENTREGA: 'En proceso',
  ENTREGADA: 'Entregada',
  ANULADA: 'Anulada'
};

// Clase de badge (Bootstrap) por estado, sin colores nuevos
export const BADGE_ESTADO: { [estado: string]: string } = {
  PENDIENTE: 'badge badge-warning',
  PARCIAL: 'badge badge-info',
  LISTA_ENTREGA: 'badge badge-info',
  ENTREGADA: 'badge badge-success',
  ANULADA: 'badge badge-danger'
};

export interface ProductoSolicitable {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo?: number;
}

export interface CentroPermitido {
  id: number;
  numero_cc: number;
  cliente: string;
}

export interface ItemSolicitud {
  id: number;
  producto_id: number;
  producto: string;
  cantidad_pedida: number;
  cantidad_asignada?: number;
  cantidad_faltante?: number;
}

export interface SolicitudBodega {
  id: number;
  estado: EstadoSolicitud;
  etiqueta_estado: string;
  centro_costo: { id: number, numero_cc: number, cliente: string };
  solicitante: { tipo: 'supervisor' | 'usuario', id: number, nombre: string };
  observacion: string;
  created_at: string;
  updated_at: string;
  entregada_at: string;
  anulada_at: string;
  total_items: number;
  items?: ItemSolicitud[];
}

// El estado lo cambian los procesos de bodega (cruce RF-BOD-02, entrega RF-BOD-04); aquí solo se puede anular
export interface AccionesSolicitud {
  puede_anular: boolean;
}

export interface NuevaSolicitud {
  centro_costo_id: number;
  items: { producto_id: number, cantidad: number }[];
  observacion?: string;
}

export interface RespuestaBodega<T> {
  ok: true;
  data: T;
  meta: { page?: number, limit?: number, total?: number, acciones?: AccionesSolicitud };
}
