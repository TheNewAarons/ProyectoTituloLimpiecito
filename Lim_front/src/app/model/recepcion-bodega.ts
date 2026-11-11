// MODELOS DE RECEPCIÓN, ENTREGA Y MOVIMIENTOS DE BODEGA (RF-BOD-04). Contrato: /api/v1/bodega (Docs/bodega-solicitudes.md)

export type EstadoOrden = 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'ANULADA';

export const FILTROS_ORDEN: { valor: string, nombre: string }[] = [
  { valor: 'ENVIADA,RECIBIDA_PARCIAL', nombre: 'Por recibir' },
  { valor: 'RECIBIDA', nombre: 'Recibidas' },
  { valor: 'BORRADOR', nombre: 'Borrador' },
  { valor: '', nombre: 'Todas' }
];

export const ETIQUETA_ORDEN: { [estado: string]: string } = {
  BORRADOR: 'Borrador', ENVIADA: 'Enviada', RECIBIDA_PARCIAL: 'Recibida parcial', RECIBIDA: 'Recibida', ANULADA: 'Anulada'
};

export const BADGE_ORDEN: { [estado: string]: string } = {
  BORRADOR: 'badge badge-default', ENVIADA: 'badge badge-warning', RECIBIDA_PARCIAL: 'badge badge-info', RECIBIDA: 'badge badge-success', ANULADA: 'badge badge-danger'
};

export const TIPOS_MOVIMIENTO: { valor: string, nombre: string }[] = [
  { valor: '', nombre: 'Todos' },
  { valor: 'ENTRADA_COMPRA', nombre: 'Entrada por compra' },
  { valor: 'SALIDA_SOLICITUD', nombre: 'Salida a solicitud' },
  { valor: 'REVERSA', nombre: 'Reversa (anulación)' },
  { valor: 'AJUSTE', nombre: 'Ajuste' }
];

export interface OrdenResumen {
  id: number;
  estado: EstadoOrden;
  proveedor: string;
  enviada_at: string;
  created_at: string;
  lineas: number;
  unidades_pedidas: number;
  unidades_pendientes: number;
}

export interface LineaRecepcion {
  item_id: number;
  producto_id: number;
  producto: string;
  cantidad: number;
  cantidad_recibida: number;
  pendiente: number;
  costo_unitario: number;
}

export interface OrdenRecepcion {
  id: number;
  estado: EstadoOrden;
  proveedor: string;
  enviada_at: string;
  recibible: boolean;
  items: LineaRecepcion[];
}

export interface ResultadoRecepcion {
  orden_id: number;
  estado: EstadoOrden;
  recibidos: { producto_id: number, cantidad: number, costo_unitario: number }[];
  asignaciones: { solicitud_id: number, producto_id: number, cantidad: number }[];
  solicitudes_listas: number[];
}

export interface FormatoEntrega {
  empresa: string;
  numero: number;
  estado: string;
  vista_previa: boolean;
  fecha_entrega: string;
  centro_costo: { id: number, numero_cc: number, cliente: string };
  solicitante: { tipo: string, id: number, nombre: string };
  entregado_por: string;
  observacion: string;
  items: { producto: string, cantidad: number, precio_unitario: number, total: number, costo_estimado: boolean, sin_costo: boolean }[];
  total: number;
  hay_costo_estimado: boolean;
  hay_sin_costo: boolean;
}

export interface MovimientoBodega {
  id: number;
  producto_id: number;
  producto: string;
  tipo: string;
  cantidad: number;
  referencia_tipo: string;
  referencia_id: number;
  contexto_usuario: string;
  usuario_id: number;
  created_at: string;
}
