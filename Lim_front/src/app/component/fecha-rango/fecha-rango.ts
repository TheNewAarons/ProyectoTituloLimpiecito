import { Directive, ElementRef, Input, NgModule, OnChanges, Renderer2 } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

// AUT-026 (retroalimentación): mismos límites que limpi_back/services/validacion/fechas-rango.js.
// [años hacia atrás, años hacia adelante] respecto de hoy (America/Santiago).
export const RANGOS_FECHA: { [campo: string]: [number, number, string] } = {
  fecha_nacimiento: [-80, -18, 'Debe corresponder a una edad entre 18 y 80 años'],
  fecha_inicio_contrato: [-40, 1, 'Entre hace 40 años y dentro de 1 año'],
  fecha_termino_contrato: [-40, 5, 'Entre hace 40 años y dentro de 5 años'],
  fecha_facturacion: [-10, 2, 'Entre hace 10 años y dentro de 2 años']
};

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const sumarAnios = (ymd: string, n: number) => String(Number(ymd.slice(0, 4)) + n) + ymd.slice(4);
// El editar recibe la fecha con hora ('2026-11-01T00:00:00.000Z'): se compara solo el día.
const aYmd = (v: any): string => (v ? String(v).slice(0, 10) : '');

/**
 * Uso: <input type="date" [(ngModel)]="x.fecha_nacimiento" appFechaRango="fecha_nacimiento" [fechaDespuesDe]="x.fecha_inicio">
 * Pone min/max al selector y marca el campo inválido (error `fechaRango` con el mensaje) si se escribe una fecha fuera de rango.
 */
@Directive({
  selector: '[appFechaRango]',
  providers: [{ provide: NG_VALIDATORS, useExisting: FechaRangoDirective, multi: true }]
})
export class FechaRangoDirective implements Validator, OnChanges {
  @Input() appFechaRango: string;
  @Input() fechaDespuesDe: any;
  private alCambiar: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  private limites(): { min: string, max: string, mensaje: string } {
    const r = RANGOS_FECHA[this.appFechaRango];
    const h = hoy();
    let min = sumarAnios(h, r[0]);
    const despues = aYmd(this.fechaDespuesDe);
    if (despues && despues > min) min = despues;
    return { min: min, max: sumarAnios(h, r[1]), mensaje: r[2] };
  }

  ngOnChanges() {
    if (!RANGOS_FECHA[this.appFechaRango]) return;
    const l = this.limites();
    this.renderer.setAttribute(this.el.nativeElement, 'min', l.min);
    this.renderer.setAttribute(this.el.nativeElement, 'max', l.max);
    this.alCambiar(); // revalida el término cuando cambia el inicio
  }

  validate(c: AbstractControl): ValidationErrors | null {
    // El editar carga la fecha con hora y el <input type="date"> la rechaza (campo vacío y aviso en consola):
    // se deja solo el día (en UTC, como se guardó) para que se vea. El valor guardado no cambia de día.
    if (typeof c.value === 'string' && c.value.length > 10 && /^\d{4}-\d{2}-\d{2}T/.test(c.value)) {
      const dia = c.value.slice(0, 10);
      Promise.resolve().then(() => c.setValue(dia));
    }
    const v = aYmd(c.value);
    if (!v || !RANGOS_FECHA[this.appFechaRango]) return null;
    const despues = aYmd(this.fechaDespuesDe);
    if (despues && v < despues) return { fechaRango: 'No puede ser anterior al inicio de contrato' };
    // Una fecha que no se tocó (p. ej. la guardada en una ficha antigua) no bloquea el editar; el backend hace lo mismo.
    if (c.pristine) return null;
    const l = this.limites();
    return v < l.min || v > l.max ? { fechaRango: l.mensaje } : null;
  }

  registerOnValidatorChange(fn: () => void) { this.alCambiar = fn; }
}

@NgModule({ declarations: [FechaRangoDirective], exports: [FechaRangoDirective] })
export class FechaRangoModule {}
