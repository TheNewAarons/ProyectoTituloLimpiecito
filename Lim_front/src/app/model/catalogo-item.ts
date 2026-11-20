// RF-WEB-01: ítem del catálogo web (formato de /api/v1/web/catalogo)
export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number | null;
  imagen_url: string | null;
  orden: number;
  // RF-WEB-01b: vínculo con la app de reservas (solo en la administración)
  servicio_id?: number | null;
  servicio_app?: ServicioApp | null;
  aviso_app?: string | null;
  publicado: boolean;
}

// RF-WEB-01b: servicio de la app de reservas que se puede vincular a un ítem
export interface ServicioApp {
  id: number;
  nombre: string;
  precio: number | null;
  activo: boolean;
}

export interface RespuestaCatalogo<T> {
  ok: boolean;
  data: T;
  meta: any;
}
