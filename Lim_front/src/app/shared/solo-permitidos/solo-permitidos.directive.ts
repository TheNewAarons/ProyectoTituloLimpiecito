import { Directive, ElementRef, HostListener, Input, NgModule } from '@angular/core';

export type TipoCampo = 'entero' | 'decimal' | 'rut' | 'telefono' | 'letras';

// Caracteres que se borran al tipear o pegar, según el tipo de campo.
export const NO_PERMITIDOS: { [tipo in TipoCampo]: RegExp } = {
  entero: /[^\d]/g,
  decimal: /[^\d.,]/g,
  rut: /[^\dkK.\- ]/g,
  telefono: /[^\d+ ]/g,
  letras: /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]/g
};

/**
 * Validación al tipear:
 * - `<input appSoloPermitidos="rut|telefono|entero|decimal|letras">` borra lo que no corresponde (también al pegar).
 * - Todo `<input type="number">` bloquea `e`, `+` y `-` (el navegador los acepta y dejan el valor vacío o negativo).
 */
@Directive({ selector: 'input[type=number], input[appSoloPermitidos]' })
export class SoloPermitidosDirective {
  @Input() appSoloPermitidos: TipoCampo;

  constructor(private el: ElementRef) {}

  @HostListener('keydown', ['$event'])
  alPresionar(evento: KeyboardEvent): void {
    if (this.el.nativeElement.type === 'number' && ['e', 'E', '+', '-'].indexOf(evento.key) >= 0) {
      evento.preventDefault();
    }
  }

  @HostListener('input')
  alEscribir(): void {
    const patron = NO_PERMITIDOS[this.appSoloPermitidos];
    const input: HTMLInputElement = this.el.nativeElement;
    if (!patron || input.type === 'number') { return; }
    const limpio = input.value.replace(patron, '');
    if (limpio !== input.value) {
      input.value = limpio;
      // Re-emite el evento para que ngModel / formControl tomen el valor limpio (sea cual sea el orden de los listeners).
      input.dispatchEvent(new Event('input'));
    }
  }
}

@NgModule({
  declarations: [SoloPermitidosDirective],
  exports: [SoloPermitidosDirective]
})
export class SoloPermitidosModule {}
