import { Component, Input } from '@angular/core';

export type FormatoKpi = 'clp' | 'numero' | 'porcentaje';
export type ColorKpi = 'warning' | 'success' | 'info' | 'rose';

// RF-BI-01a: tarjeta KPI (card-stats de la guía UI §5). valor null = "Sin datos".
@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html'
})
export class KpiCardComponent {
  @Input() titulo = '';
  @Input() valor: number | null = null;
  @Input() formato: FormatoKpi = 'clp';
  @Input() icono = 'insights';
  @Input() color: ColorKpi = 'info';
  @Input() detalle?: string;
  @Input() cargando = false;
}
