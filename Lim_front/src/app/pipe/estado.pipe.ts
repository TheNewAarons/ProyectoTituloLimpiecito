import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estado'
})
export class EstadoPipe implements PipeTransform {
  /**  ESTADOS DE RESERVA
   *   1 = FINALIZADO
   *   2 = APROBADO
   *   3 = EN PROCESO
   *   4 = RECHAZADO
   */
  transform(value: any, args?: any): any {
    switch (value) {
      case 1:
        return 'Finalizado';
      case 2:
        return 'Aprobado';
      case 3:
        return 'En Proceso';
      case 4:
        return 'Rechazado';
    }
    return null;
  }
}
