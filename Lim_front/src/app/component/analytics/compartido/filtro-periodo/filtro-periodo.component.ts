import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { RangoPeriodo } from '../../../../model/analytics';

// Mes actual en America/Santiago (YYYY-MM) sin depender de la zona del navegador.
export function mesActualSantiago(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }).slice(0, 7);
}

// Lista de meses YYYY-MM desde `hasta` hacia atrás (más reciente primero).
export function generarMeses(hasta: string, cantidad: number): string[] {
  const anio = Number(hasta.slice(0, 4));
  const mes = Number(hasta.slice(5, 7)) - 1;
  const meses: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const total = anio * 12 + mes - i;
    const m = (total % 12) + 1;
    meses.push(Math.floor(total / 12) + '-' + (m < 10 ? '0' + m : String(m)));
  }
  return meses;
}

// RF-BI-01a: filtro desde–hasta por mes con dos mat-select (D-150). No emite si desde > hasta.
@Component({
  selector: 'app-filtro-periodo',
  templateUrl: './filtro-periodo.component.html'
})
export class FiltroPeriodoComponent implements OnInit, OnChanges {
  @Input() desde = '';
  @Input() hasta = '';
  @Input() mesesAtras = 36;
  @Output() cambio = new EventEmitter<RangoPeriodo>();

  meses: string[] = [];

  // ngOnChanges no corre si el padre no enlaza ningún input.
  ngOnInit(): void {
    this.ngOnChanges();
  }

  ngOnChanges(): void {
    const actual = mesActualSantiago();
    this.meses = generarMeses(actual, this.mesesAtras);
    if (!this.hasta) { this.hasta = actual; }
    if (!this.desde) { this.desde = this.hasta; }
  }

  get invalido(): boolean {
    return this.desde > this.hasta; // YYYY-MM compara bien como texto
  }

  emitir(): void {
    if (!this.invalido) {
      this.cambio.emit({ desde: this.desde, hasta: this.hasta });
    }
  }
}
