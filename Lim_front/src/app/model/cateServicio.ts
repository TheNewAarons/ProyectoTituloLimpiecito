export class CateServicio {
  constructor(
    public id: number,
    public nombre: string,
    public activar_cantidad: Boolean,
    public estado: number,
    public imagen: string
  ) {}
}
