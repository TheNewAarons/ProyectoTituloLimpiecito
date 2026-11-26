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
  color?: 'danger' | 'warning' | 'success'; // sin color: el de chart.js por defecto
}

export interface RangoPeriodo {
  desde: string;
  hasta: string;
}

// GET /analytics/periodos: primer mes (YYYY-MM) con datos por dashboard; null si aún no hay datos.
export interface PrimerosPeriodos {
  financiero: string | null;
  rentabilidad: string | null;
  bodega: string | null;
  productividad: string | null;
}

export type FuenteAnalytics = keyof PrimerosPeriodos;

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

// RF-BI-03: consumo de bodega (/api/v1/analytics/bodega/*)
export type AgruparConsumo = 'mes' | 'supervisor' | 'centro_costo';

export interface FilaTopProducto {
  posicion: number;
  producto_id: number;
  producto: string;
  cantidad_pedida: number;
  cantidad_entregada: number;
  solicitudes: number;
}

export interface FilaConsumoMes {
  periodo: string;
  cantidad: number;
  solicitudes: number;
}

export interface FilaConsumoGrupo {
  id: number | null;
  tipo?: 'TRABAJADOR' | 'USUARIO' | null;
  etiqueta: string;
  cantidad: number;
  solicitudes: number;
  productos: number;
}

export interface MetaConsumo {
  desde: string;
  hasta: string;
  agrupar: AgruparConsumo;
  producto_id: number | null;
  total: number;
}

export interface FilaFrecuenciaCompra {
  producto_id: number;
  producto: string;
  ordenes: number;
  cantidad: number;
  ultima_compra: string;
  dias_promedio_entre_compras: number | null;
}

// RF-BOD-04: merma (unidades rechazadas al recibir órdenes de compra) por producto
export interface FilaMerma {
  producto_id: number;
  producto: string;
  recibido: number;
  rechazado: number;
  porcentaje_merma: number;
  costo_merma: number;
  recepciones_con_rechazo: number;
  ultimo_motivo: string | null;
}

export interface MetaMerma {
  desde: string;
  hasta: string;
  recibido: number;
  rechazado: number;
  porcentaje_merma: number;
  costo_merma: number;
  por_mes: { periodo: string, recibido: number, rechazado: number }[];
}

export interface FilaStockCritico {
  producto_id: number;
  producto: string;
  stock: number;
  stock_minimo: number;
  faltante: number;
}

// RF-BI-04: productividad PEV (/api/v1/analytics/productividad/*)
export interface FiltrosProductividad {
  desde: string;
  hasta: string;
  clienteId?: number | null;
  supervisor?: number | null; // n_empleado del supervisor
}

export interface FilaProductividadTrabajador {
  trabajador_id: number | null;
  nombre: string;
  n_empleado: number | null;
  dias: number;
  tareas: number;
  pasos_asignados: number;
  pasos_marcados: number;
  cumplimiento_pct: number | null;
}

export interface FilaProductividadSupervisor {
  posicion: number;
  n_empleado: number;
  trabajador_id: number | null;
  nombre: string;
  listas: number;
  listas_firmadas: number;
  tareas: number;
  rondas_asignadas: number;
  rondas_verificadas: number;
  verificacion_pct: number | null;
}

export interface FilaProductividadSector {
  sector_id: number;
  sector: string;
  cliente_id: number | null;
  cliente: string | null;
  tareas: number;
  cumplimiento_pct: number | null;
  observaciones: number;
  observaciones_trabajador: number;
  observaciones_supervisor: number;
}

export interface MetaProductividad {
  desde: string;
  hasta: string;
  cliente_id: number | null;
  supervisor: number | null;
  tareas?: number;
  cumplimiento_pct?: number | null;
  verificacion_pct?: number | null;
  observaciones?: number;
}
