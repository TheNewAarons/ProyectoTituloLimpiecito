import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { SerieGrafico } from '../../../../model/analytics';

export type TipoGrafico = 'line' | 'bar';

// RF-BI-01a: envoltorio de ng2-charts. Colores por defecto de chart.js (D-150, sin hex nuevos).
@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.scss']
})
export class GraficoComponent implements OnChanges {
  @Input() tipo: TipoGrafico = 'line';
  @Input() etiquetas: string[] = [];
  @Input() series: SerieGrafico[] = [];
  @Input() titulo?: string;

  datasets: ChartDataSets[] = [];
  opciones: ChartOptions = { responsive: true, maintainAspectRatio: false };

  ngOnChanges(): void {
    this.datasets = (this.series || []).map((s: SerieGrafico): ChartDataSets => ({ label: s.etiqueta, data: s.datos, fill: false }));
  }
}
