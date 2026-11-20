import { Component, OnInit } from '@angular/core';
import { PuntoTendencia, ResumenFinanciero, SerieGrafico } from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';

// RF-BI-01: Dashboard financiero. Carga inicial solo con /resumen; la tendencia (12 meses) llega después y no bloquea los KPI.
@Component({
  selector: 'app-dashboard-financiero',
  templateUrl: './dashboard-financiero.component.html'
})
export class DashboardFinancieroComponent implements OnInit {
  resumen: ResumenFinanciero | null = null;
  cargando = true;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService) {}

  ngOnInit(): void {
    this.analyticsService.resumenFinanciero().subscribe(
      (r) => {
        this.resumen = r.data;
        this.cargando = false;
        this.cargarTendencia();
      },
      () => {
        this.cargando = false;
        this.alertas.alertaErrorMsj('No se pudo cargar el dashboard financiero');
      }
    );
  }

  private cargarTendencia(): void {
    this.analyticsService.tendenciaFinanciera().subscribe(
      (r) => {
        const puntos: PuntoTendencia[] = r.data;
        this.etiquetas = puntos.map((p: PuntoTendencia): string => p.periodo);
        this.series = [
          { etiqueta: 'Ingresos', datos: puntos.map((p: PuntoTendencia): number => p.ingresos) },
          { etiqueta: 'Egresos', datos: puntos.map((p: PuntoTendencia): number => p.egresos) },
          { etiqueta: 'Utilidad', datos: puntos.map((p: PuntoTendencia): number => p.utilidad) }
        ];
      },
      () => this.alertas.alertaErrorMsj('No se pudo cargar la tendencia')
    );
  }

  get proyeccionUtilidad(): number | null {
    const p = this.resumen && this.resumen.proyeccion;
    return p && !p.insuficiente && p.promedio_movil ? p.promedio_movil.utilidad : null;
  }
}
