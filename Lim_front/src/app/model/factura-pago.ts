// MODELO E INTERFACES PARA EL ESTADO DE PAGO DE INGRESOS/EGRESOS (RF-FAC-01)

export type EstadoPagoFactura = 'PENDIENTE' | 'PAGADA' | 'ANULADA';
export type TipoDocumento = 'FACTURA' | 'BOLETA' | 'OTRO';

export interface ResumenFacturas {
  por_cobrar: { cantidad: number; monto_total: number };
  por_pagar: { cantidad: number; monto_total: number };
}

// Ingreso de un centro de costo (cc_ingresos) con su estado de pago, como lo entrega GET /api/v1/ingresos
export interface IngresoFactura {
  id: number;
  fecha: string;
  monto: number;
  comentario: string | null;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  estado_pago: EstadoPagoFactura;
  fecha_pago: string | null;
  centroCostoId: number;
  numero_cc: string | null;
}
