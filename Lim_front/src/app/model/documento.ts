export class Documento {
  constructor(
    public id: number,
    public nombre: string,
    public fecha_subida: Date,
    public url: string,
    public estado: Boolean,
    public categoriaDocumentoId: number
  ) {}
}
