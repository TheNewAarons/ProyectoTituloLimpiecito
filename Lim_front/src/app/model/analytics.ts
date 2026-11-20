// RF-BI-01a: tipos base del módulo Analytics (/api/v1/analytics, formato { ok, data, meta })

export interface FiltrosAnalytics {
  desde?: string; // YYYY-MM
  hasta?: string; // YYYY-MM
  periodo?: string; // YYYY-MM
  centroCostoId?: number | null;
  clienteId?: number | null;
}

export interface MetaAnalytics {
  desde?: string;
  hasta?: string;
  total?: number;
  estimacion?: boolean;
}

export interface RespuestaAnalytics<T> {
  ok: true;
  data: T;
  meta: MetaAnalytics;
}

export interface SerieGrafico {
  etiqueta: string;
  datos: number[];
}

export interface RangoPeriodo {
  desde: string;
  hasta: string;
}

export interface OpcionCliente {
  id: number;
  nombre: string;
}

// RF-BI-01: Dashboard financiero (/api/v1/analytics/financiero)
export interface MovimientoProyectado {
  ingresos: number;
  egresos: number;
  utilidad: number;
}

export interface RegresionProyectada extends MovimientoProyectado {
  periodo: string;
}

export interface ProyeccionFinanciera {
  insuficiente: boolean;
  mensaje?: string;
  meses_historia: number;
  promedio_movil: MovimientoProyectado | null;
  regresion: RegresionProyectada | null;
  estimacion: boolean;
}

export interface ResumenFinanciero {
  periodo: string;
  utilidad_real: MovimientoProyectado & { cerrada: boolean | null };
  saldo_acumulado: { saldo: number; provisional: boolean };
  proyeccion: ProyeccionFinanciera;
  alerta_utilidad: { activa: boolean; umbral: number; motivo: string | null };
  liquidaciones_pendientes: { cantidad: number; monto: number };
  por_cobrar: { cantidad: number; monto: number; nota: string };
  por_pagar: { cantidad: number; monto: number };
}

export interface PuntoTendencia extends MovimientoProyectado {
  periodo: string;
}
