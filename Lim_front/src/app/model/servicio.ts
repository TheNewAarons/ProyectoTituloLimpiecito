export class Servicio {
  constructor(
    public id: number,
    public nombre: string,
    public descripcion: string,
    public precio: number,
    public estado: number,
    public imagen: string,
    public categoriaServicioId: number
  ) {}
}
