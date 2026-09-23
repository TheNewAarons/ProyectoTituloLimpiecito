export class TrabajadorDocumento {
  constructor(
    public id: number,
    public fecha: string,
    public estado: Boolean,
    public documentoId: number,
    public trabajadoreId: number,
    public nombre: string
  ) {}
}
