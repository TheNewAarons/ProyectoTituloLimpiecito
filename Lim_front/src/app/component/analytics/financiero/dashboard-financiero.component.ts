import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PuntoTendencia, RangoPeriodo, ResumenFinanciero, SerieGrafico } from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';

// RF-BI-01: Dashboard financiero. KPI del mes `hasta`; la tendencia (desde–hasta, 12 meses por defecto) llega después y no bloquea los KPI.
@Component({
  selector: 'app-dashboard-financiero',
  templateUrl: './dashboard-financiero.component.html'
})
export class DashboardFinancieroComponent implements OnInit {
  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 12)[11];
  resumen: ResumenFinanciero | null = null;
  cargando = true;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const rango = rangoDesdeQuery(this.route.snapshot.queryParamMap);
    if (rango) {
      this.desde = rango.desde;
      this.hasta = rango.hasta;
    }
    this.cargar();
  }

  cambiarPeriodo(rango: RangoPeriodo): void {
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.analyticsService.resumenFinanciero(this.hasta).subscribe(
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
    this.analyticsService.tendenciaFinanciera(this.desde, this.hasta).subscribe(
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
