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
  { valor: 'AJUSTE', nombre: 'Ajuste' },
  { valor: 'SALDO_INICIAL', nombre: 'Saldo inicial' },
  { valor: 'ENTRADA_MANUAL', nombre: 'Entrada manual (stock rápido)' }
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

// RF-BOD-04b: documento de respaldo y historial de recepciones de una orden
export const DOCUMENTOS_RECEPCION: { valor: string, nombre: string }[] = [
  { valor: 'GUIA', nombre: 'Guía de despacho' },
  { valor: 'FACTURA', nombre: 'Factura' }
];

export interface DocumentoRecepcion {
  documento_tipo: string;
  documento_numero: string;
  observacion: string;
}

export interface RecepcionHistorial {
  id: number;
  fecha_recepcion: string;
  documento_tipo: string;
  documento_numero: string;
  observacion: string;
  estado: string;
  historica: boolean;
  items: { item_id: number, producto_id: number, producto: string, cantidad: number, costo_unitario: number }[];
}

export interface OrdenRecepcion {
  id: number;
  estado: EstadoOrden;
  proveedor: string;
  enviada_at: string;
  recibible: boolean;
  items: LineaRecepcion[];
  recepciones: RecepcionHistorial[];
}

export interface ResultadoRecepcion {
  orden_id: number;
  recepcion_id: number;
  estado: EstadoOrden;
  recibidos: { producto_id: number, cantidad: number, costo_unitario: number }[];
  diferencias_precio: { item_id: number, producto_id: number, costo_oc: number, costo_real: number }[];
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
  // RF-BOD-06: kardex valorizado (null en movimientos previos al kardex)
  stock_anterior?: number;
  stock_resultante?: number;
  costo_unitario?: number;
  valor_movimiento?: number;
  valor_saldo_anterior?: number;
  valor_saldo_resultante?: number;
  movimiento_revertido_id?: number;
  motivo?: string;
}

// RF-BOD-06: GET /bodega/productos/:id/kardex
export interface KardexProducto {
  producto: { id: number, nombre: string };
  saldo: { stock: number, stock_kardex: number, valor_saldo: number, costo_promedio: number, cuadrado: boolean };
  movimientos: MovimientoBodega[];
}

// RF-BOD-07: conteo físico de inventario (BORRADOR -> APROBADO | ANULADO)
export const FILTROS_CONTEO: { valor: string, nombre: string }[] = [
  { valor: 'BORRADOR', nombre: 'En curso' },
  { valor: 'APROBADO', nombre: 'Aprobados' },
  { valor: 'ANULADO', nombre: 'Anulados' },
  { valor: '', nombre: 'Todos' }
];

export const ETIQUETA_CONTEO: { [estado: string]: string } = { BORRADOR: 'En curso', APROBADO: 'Aprobado', ANULADO: 'Anulado' };

export const BADGE_CONTEO: { [estado: string]: string } = {
  BORRADOR: 'badge badge-warning', APROBADO: 'badge badge-success', ANULADO: 'badge badge-danger'
};

export interface ConteoResumen {
  id: number;
  fecha: string;
  estado: string;
  observacion: string;
  responsable_id: number;
  aprobado_por: number;
  aprobado_at: string;
  items_total: number;
  items_contados: number;
  // % de ítems contados sin diferencia (null si no hay contados)
  exactitud: number;
}

export interface ConteoItem {
  item_id: number;
  producto_id: number;
  producto: string;
  cantidad_teorica: number;
  cantidad_contada: number;
  diferencia: number;
  motivo: string;
  movimiento_id: number;
}

export interface ConteoDetalle extends ConteoResumen {
  items: ConteoItem[];
}

// RF-BOD-03: proveedores (baja lógica con activo = 0)
export interface Proveedor {
  id: number;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  contacto: string;
  activo: number;
}

export type DatosProveedor = Pick<Proveedor, 'nombre' | 'rut' | 'email' | 'telefono' | 'contacto'>;

export interface ResultadoAprobacionConteo {
  conteo: ConteoDetalle;
  ajustes: { item_id: number, producto_id: number, cantidad: number, movimiento_id: number }[];
  recalculados: { item_id: number, producto_id: number, cantidad_teorica: number, stock_actual: number }[];
}
