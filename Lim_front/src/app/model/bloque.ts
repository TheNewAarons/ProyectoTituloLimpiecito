export class Bloque {
  constructor(
    public id: number,
    public hora_inicio: any,
    public hora_fin: any,
    public activo:Boolean,
    public diaId: number
  ) {}
}
