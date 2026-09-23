export class ClienteDocumento {
  constructor(
    public id: number,
    public fecha: string,
    public estado: Boolean,
    public documentoId: number,
    public clienteId: number,
    public nombre: string
  ) {}
}
