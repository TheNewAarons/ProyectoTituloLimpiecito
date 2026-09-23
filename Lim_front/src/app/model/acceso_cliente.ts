export class AccesoCliente {
  constructor(
    public id: number, 
    public nombre:string,
    public correo: string,
    public password: string,
    public clienteId: number
  ) {}
}
