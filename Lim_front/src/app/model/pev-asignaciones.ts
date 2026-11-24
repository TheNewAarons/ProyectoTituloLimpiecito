// RF-PEV-02 (AUT-016, obs. 12) — tipos de asignaciones PEV para las pantallas de actividad y cronograma.
export interface AsignacionPev {
  id: number;
  actividad_id: number;
  area_id: number;
  trabajador_id: number;
  turno_id: number;
  fecha_desde: string;
  fecha_hasta: string | null;
  estado: 'ACTIVA' | 'CERRADA' | 'ANULADA' | string;
  area?: { id: number; nombre: string };
  trabajador?: { id: number; nombre: string; apellido: string; n_empleado?: number };
  turno?: { id: number; nombre: string };
}

export interface AsignacionCronograma {
  id: number;
  estado: string;
  fecha_desde: string;
  fecha_hasta: string | null;
  actividad_id: number;
  actividad: string;
  sector: string;
  area: string;
  trabajador_id: number;
  trabajador: string;
  n_empleado: number;
}

export interface LineaCumplimiento {
  id: number;
  tipo: 'trabajador' | 'supervisor';
  fecha: string;
  pasos?: { paso: number; marcado: number; hora: string | null }[];
  rondas?: { ronda: number; hora: string | null }[];
}
