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
