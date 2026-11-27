import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { FuenteAnalytics, PrimerosPeriodos, RangoPeriodo } from '../../../../model/analytics';
import { AnalyticsService } from '../../../../services/analytics/analytics.service';

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

// Rango mínimo de los tableros: 3 meses contando desde y hasta.
export const MESES_MINIMOS = 3;

function indiceMes(periodo: string): number {
  return Number(periodo.slice(0, 4)) * 12 + Number(periodo.slice(5, 7));
}

export function rangoValido(desde: string, hasta: string, minimo: number = MESES_MINIMOS): boolean {
  return indiceMes(hasta) - indiceMes(desde) >= minimo - 1;
}

// Rango recibido en la URL (?desde=YYYY-MM&hasta=YYYY-MM) desde el inicio de Analytics; null si falta o no es válido.
export function rangoDesdeQuery(q: ParamMap): RangoPeriodo | null {
  const desde = q.get('desde');
  const hasta = q.get('hasta');
  const formato = /^\d{4}-(0[1-9]|1[0-2])$/;
  return desde && hasta && formato.test(desde) && formato.test(hasta) && rangoValido(desde, hasta) ? { desde: desde, hasta: hasta } : null;
}

// Primer mes con datos de `fuente`; sin fuente (inicio) el más antiguo de todos los dashboards.
export function primerMesDe(p: PrimerosPeriodos | null, fuente: FuenteAnalytics | null): string | null {
  if (!p) { return null; }
  const candidatos = (fuente ? [p[fuente]] : [p.financiero, p.rentabilidad, p.bodega, p.productividad]).filter((m: string | null) => !!m);
  return candidatos.length ? candidatos.sort()[0] : null;
}

// Id positivo recibido en la URL (cliente_id, centro_costo_id); null si falta o no es válido.
export function idDesdeQuery(q: ParamMap, clave: string): number | null {
  const valor = q.get(clave);
  return valor && /^[1-9]\d{0,9}$/.test(valor) ? Number(valor) : null;
}

// RF-BI-01a: filtro desde–hasta por mes con dos mat-select (D-150). Los meses que dejarían el rango bajo `mesesMinimos` quedan deshabilitados; no emite si el rango es inválido.
@Component({
  selector: 'app-filtro-periodo',
  templateUrl: './filtro-periodo.component.html'
})
export class FiltroPeriodoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() desde = '';
  @Input() hasta = '';
  @Input() mesesAtras = 36;
  @Input() mesesMinimos = MESES_MINIMOS; // 1 = sin mínimo (solo desde <= hasta)
  @Input() fuente: FuenteAnalytics | null = null; // dashboard cuyo primer mes con datos limita las opciones
  @Output() cambio = new EventEmitter<RangoPeriodo>();

  meses: string[] = [];
  primerMes: string | null = null;
  private suscripcion: Subscription | null = null;

  constructor(private analyticsService: AnalyticsService) {}

  // ngOnChanges no corre si el padre no enlaza ningún input.
  ngOnInit(): void {
    this.ngOnChanges();
    this.suscripcion = this.analyticsService.primerosPeriodos().subscribe((p: PrimerosPeriodos | null) => this.limitarA(primerMesDe(p, this.fuente)));
  }

  ngOnDestroy(): void {
    if (this.suscripcion) { this.suscripcion.unsubscribe(); }
  }

  // Quita los meses sin datos; si el desde actual queda antes del primer mes, lo corre y recarga el tablero.
  limitarA(primerMes: string | null): void {
    this.primerMes = primerMes;
    this.ngOnChanges();
    if (primerMes && this.desde < primerMes) {
      this.desde = primerMes;
      // con la respuesta en caché esto corre dentro del ngOnInit: emitir fuera del ciclo de detección del padre
      Promise.resolve().then(() => this.emitir());
    }
  }

  ngOnChanges(): void {
    const actual = mesActualSantiago();
    const conDatos = this.primerMes && this.primerMes <= actual ? indiceMes(actual) - indiceMes(this.primerMes) + 1 : this.mesesAtras;
    this.meses = generarMeses(actual, Math.min(this.mesesAtras, conDatos));
    if (!this.hasta) { this.hasta = actual; }
    if (!this.desde) { this.desde = generarMeses(this.hasta, this.mesesMinimos)[this.mesesMinimos - 1]; }
  }

  get invalido(): boolean {
    return !rangoValido(this.desde, this.hasta, this.mesesMinimos);
  }

  desdeDeshabilitado(mes: string): boolean {
    return !rangoValido(mes, this.hasta, this.mesesMinimos);
  }

  hastaDeshabilitado(mes: string): boolean {
    return !rangoValido(this.desde, mes, this.mesesMinimos);
  }

  emitir(): void {
    if (!this.invalido) {
      this.cambio.emit({ desde: this.desde, hasta: this.hasta });
    }
  }
}
