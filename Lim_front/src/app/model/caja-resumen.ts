// MODELO E INTERFACES PARA EL RESUMEN/CIERRE DE CAJA POR PERIODO (RF-CAJA-01)

export type EstadoCaja = 'ABIERTA' | 'CERRADA';

export interface CajaResumen {
  periodo: string;
  caja_id?: number;
  saldo_inicial: number;
  ingresos: number;
  egresos: number;
  saldo_actual: number;
  saldo_final?: number | null;
  estado: EstadoCaja;
  saldo_provisional: boolean;
  pendientes?: {
    cantidad: number;
    monto: number;
  };
}

export interface CajaHistorialItem {
  periodo: string;
  estado: EstadoCaja;
  saldo_inicial: number;
  ingresos: number;
  egresos: number;
  saldo_final: number | null;
  provisional: boolean;
}

export interface CajaCierreResultado {
  caja: unknown;
  siguiente?: unknown;
  recalculados?: unknown[];
}

export interface CajaReaperturaResultado {
  caja: unknown;
}
