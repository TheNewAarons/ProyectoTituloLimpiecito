import { Component, Input, OnChanges } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { SerieGrafico } from '../../../../model/analytics';

export type TipoGrafico = 'line' | 'bar';

// chart.js necesita el color como texto: mismos valores que $brand-danger/$brand-warning/$brand-success (GUIA-ESTILO-UI §2).
const COLORES: { [nombre: string]: string } = { danger: '#f44336', warning: '#ff9800', success: '#4caf50' };

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

  // RF-BI-03: eje Y solo con enteros desde 0 (cantidades/unidades); opcional, sin efecto si no se usa.
  @Input() set enteros(valor: boolean) {
    if (valor) {
      this.opciones = Object.assign({}, this.opciones, { scales: { yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] } });
    }
  }

  // Obs. 11: montos en peso chileno ($6.088.275; negativos -$6.088.275) en eje Y y tooltip; opcional, sin efecto si no se usa.
  // shortcut: no combinar con [enteros] (cada uno reemplaza `scales`); si una pantalla necesita ambos, unir los ticks.
  @Input() set pesos(valor: boolean) {
    if (valor) {
      const clp = (v: any) => {
        const n = Math.round(Number(v));
        return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-CL');
      };
      this.opciones = Object.assign({}, this.opciones, {
        scales: { yAxes: [{ ticks: { callback: clp } }] },
        tooltips: { callbacks: { label: (item: any, data: any) => (data.datasets[item.datasetIndex].label || '') + ': ' + clp(item.yLabel) } }
      });
    }
  }

  ngOnChanges(): void {
    this.datasets = (this.series || []).map((s: SerieGrafico): ChartDataSets => {
      const color = s.color ? COLORES[s.color] : undefined;
      return color
        ? { label: s.etiqueta, data: s.datos, fill: false, borderColor: color, backgroundColor: color, pointBackgroundColor: color }
        : { label: s.etiqueta, data: s.datos, fill: false };
    });
  }
}
