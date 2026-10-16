// MODELO E INTERFACES PARA EL ESTADO DE PAGO DE LIQUIDACIONES (RF-CAJA-02)

export type EstadoPagoLiquidacion = 'EN_ESPERA' | 'PAGADA' | 'ANULADA';

export interface TrabajadorResumenPago {
  nombre?: string;
  apellido?: string;
  rut?: string;
}

export interface CentroCostoResumenPago {
  numero_cc?: number;
  cliente?: {
    representante?: string;
  };
}

export interface LiquidacionPago {
  id: number;
  estado_pago: EstadoPagoLiquidacion;
  fecha_pago: string | null;
  liquido_pagar: number;
  fecha_creacion: string;
  trabajador?: TrabajadorResumenPago;
  centro_costo?: CentroCostoResumenPago;
}

export interface ResumenPendientesPago {
  cantidad: number;
  monto_total: number;
}

export interface ApiErrorDetalle {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiOkResponse<T> {
  ok: true;
  data: T;
  meta?: {
    page?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorDetalle;
}
