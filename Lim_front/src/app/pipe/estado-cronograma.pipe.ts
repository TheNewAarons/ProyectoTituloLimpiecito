import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'estadoCronograma'
})
export class EstadoCronogramaPipe implements PipeTransform {

  /**  ESTADOS DE CRONOGRAMA
   *   0 = CANCELADO
   *   1 = EN CURSO
   *   2 = FINALIZADO
   */
   transform(value: any, args?: any): any {
    switch (value) {
      case 0:
        return 'Cancelado';
      case 1:
        return 'En Curso';
      case 2:
        return 'Finalizado y Firmado';
    }
    return null;
  }

}
