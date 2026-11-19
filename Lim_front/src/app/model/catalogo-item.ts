// RF-WEB-01: ítem del catálogo web (formato de /api/v1/web/catalogo)
export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number | null;
  imagen_url: string | null;
  orden: number;
  publicado: boolean;
}

export interface RespuestaCatalogo<T> {
  ok: boolean;
  data: T;
  meta: any;
}
