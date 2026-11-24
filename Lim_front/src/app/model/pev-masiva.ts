// RF-PEV-01: asignación masiva PEV (formato de /api/v1/pev/asignaciones-masivas)
export interface OpcionSimple {
  id: number;
  nombre: string;
}

export interface AreaPev extends OpcionSimple {
  sector: string;
}

export interface TrabajadorPev {
  id: number;
  nombre: string;
  apellido: string;
  rut: string;
  n_empleado: number;
  ya_trabajo_en_cliente: boolean;
}

export interface OpcionesCliente {
  actividades: OpcionSimple[];
  areas: AreaPev[];
  turnos: OpcionSimple[];
  trabajadores: TrabajadorPev[];
}

export interface FilaPlan {
  trabajador_id: number;
  area_id: number;
  resultado: string;
}

export interface PlanAsignacion {
  actividad: { id: number | null; nombre: string; nueva: boolean };
  turno: OpcionSimple;
  fecha_desde: string;
  filas: FilaPlan[];
  resumen: { a_crear: number; ya_asignadas: number; con_error: number; repetidas_en_la_seleccion: number };
  asignaciones_creadas?: number[];
  // RF-PEV-02 (obs. 12): cronogramas activos donde se reflejará la asignación; sin_cronograma null = no se pudo verificar.
  cronograma?: { cronogramas: { id: number; mes: number; anio: number }[]; sin_cronograma: boolean | null };
}

export interface RespuestaPev<T> {
  ok: boolean;
  data: T;
  meta: any;
}

// Texto de cada resultado de la vista previa
export const ETIQUETA_RESULTADO: { [k: string]: string } = {
  CREAR: 'Se asignará',
  YA_ASIGNADA: 'Ya tiene esta asignación (se omite)',
  VIGENCIA_SOLAPADA: 'Tiene una asignación cerrada que cubre la fecha',
  AREA_NO_EXISTE: 'El área no existe',
  AREA_CLIENTE_DISTINTO: 'El área es de otro cliente',
  TRABAJADOR_NO_EXISTE: 'El trabajador no existe'
};
