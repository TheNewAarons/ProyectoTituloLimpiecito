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

export interface RespuestaAnalytics<T, M = MetaAnalytics> {
  ok: true;
  data: T;
  meta: M;
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

// RF-BI-02: Rentabilidad por cliente / centro de costo (/api/v1/analytics/rentabilidad)
export type OrigenIngreso = 'CAJA' | 'CONTRATO_ESTIMADO' | 'MIXTO' | 'SIN_INGRESO';

export interface FilaRentabilidad {
  tipo: 'CLIENTE';
  posicion: number;
  cliente_id: number | null;
  cliente: string;
  centros: { centro_costo_id: number; numero_cc: string | number }[];
  ingreso_real: number;
  ingreso_estimado: number;
  ingreso_facturado: number;
  costo_sueldos: number;
  costo_bodega: number;
  costo_otros: number;
  egreso_estimado: number;
  costo_total: number;
  margen: number;
  margen_pct: number | null;
  margen_con_estimado: number;
  en_perdida: boolean;
  origen_ingreso: OrigenIngreso;
}

export interface FilaGastosGenerales {
  tipo: 'GASTOS_GENERALES';
  cliente: string;
  egresos_sin_centro: number;
  consumo_bodega_reasignado: number;
  gastos_generales: number;
}

export interface MetaRentabilidad extends MetaAnalytics {
  periodos: number;
  totales: {
    ingreso_real: number;
    ingreso_estimado: number;
    ingreso_facturado: number;
    costo_total: number;
    suma_margenes: number;
    gastos_generales: number;
    clientes_en_perdida: number;
  };
  utilidad_total: number;
  diferencia_conciliacion: number;
  cuadra: boolean;
}

export interface DetalleRentabilidad {
  centro: { id: number; numero_cc: string | number; cliente_id: number | null; cliente: string | null; periodo: string; estado: number };
  ingreso: { real: number; estimado: number; facturado: number; origen_ingreso: OrigenIngreso };
  costos: { sueldos: number; epp_insumos: number; otros: number; otros_estimado: number };
  costo_total: number;
  margen: number;
  margen_pct: number | null;
  margen_con_estimado: number;
  en_perdida: boolean;
  por_periodo: { periodo: string; sueldos: number; epp_insumos: number; otros: number; otros_estimado: number }[];
}
