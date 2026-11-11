// MODELO E INTERFACES PARA EL ESTADO DE PAGO DE INGRESOS/EGRESOS (RF-FAC-01)

export type EstadoPagoFactura = 'PENDIENTE' | 'PAGADA' | 'ANULADA';
export type TipoDocumento = 'FACTURA' | 'BOLETA' | 'OTRO';

export interface ResumenFacturas {
  por_cobrar: { cantidad: number; monto_total: number };
  por_pagar: { cantidad: number; monto_total: number };
}
