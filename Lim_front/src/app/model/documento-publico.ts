// MODELOS DE DOCUMENTOS PÚBLICOS (RF-WEB-02). Contrato: PATCH /api/v1/archivos/:id/publicar

export interface DocumentoArchivo {
  id: number;
  nombre: string;
  publico: boolean;
  fecha_publicacion: string | null;
  categoriaDocumentoId: number | null;
}

export interface RespuestaArchivo<T> {
  ok: boolean;
  data: T;
  meta?: object;
}
