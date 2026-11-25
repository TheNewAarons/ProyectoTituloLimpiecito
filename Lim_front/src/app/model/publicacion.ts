// RF-WEB-03: publicación (anuncio con vigencia) tal como la entrega /api/v1/web/publicaciones.
export interface Publicacion {
  id: number;
  titulo: string;
  cuerpo: string;
  imagen_url: string | null;
  fecha_publicacion: string;
  fecha_expiracion: string | null;
  publicado: boolean;
  vigente: boolean;
}
