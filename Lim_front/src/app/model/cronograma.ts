export class Cronograma {
    constructor(
      public mes:number,
      public anio: number,
      public fecha:Date,
      public estado: number,
      public fecha_inicio:Date,
      public fecha_termino:Date,
      public clienteId:number,
      public turnoId: number
    ) {}
  }