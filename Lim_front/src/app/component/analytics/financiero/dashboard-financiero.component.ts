import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PuntoTendencia, RangoPeriodo, ResumenFinanciero, SerieGrafico } from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';
import { descargarCsv, Variacion, variacionMensual } from '../compartido/csv';

// RF-BI-01: Dashboard financiero. KPI del mes `hasta`; la tendencia (desde–hasta, 12 meses por defecto) llega después y no bloquea los KPI.
@Component({
  selector: 'app-dashboard-financiero',
  templateUrl: './dashboard-financiero.component.html'
})
export class DashboardFinancieroComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 12)[11];
  resumen: ResumenFinanciero | null = null;
  cargando = true;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  puntos: PuntoTendencia[] = [];
  variacionUtilidad: Variacion | null = null; // utilidad del mes "hasta" vs el mes anterior (sale de la tendencia)

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

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  cargar(): void {
    // Cambios rápidos de período: solo vale la última respuesta; el gráfico no conserva el rango anterior si la tendencia falla.
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.cargando = true;
    this.etiquetas = [];
    this.series = [];
    this.puntos = [];
    this.variacionUtilidad = null;
    this.subs.add(this.analyticsService.resumenFinanciero(this.hasta).subscribe(
      (r) => {
        this.resumen = r.data;
        this.cargando = false;
        this.cargarTendencia();
      },
      () => {
        this.cargando = false;
        this.alertas.showNotification('No se pudo cargar el dashboard financiero', 'danger');
      }
    ));
  }

  private cargarTendencia(): void {
    this.subs.add(this.analyticsService.tendenciaFinanciera(this.desde, this.hasta).subscribe(
      (r) => {
        const puntos: PuntoTendencia[] = r.data;
        this.puntos = puntos;
        this.variacionUtilidad = variacionMensual(puntos, (p: PuntoTendencia): number => p.utilidad);
        this.etiquetas = puntos.map((p: PuntoTendencia): string => p.periodo);
        this.series = [
          { etiqueta: 'Ingresos', datos: puntos.map((p: PuntoTendencia): number => p.ingresos), color: 'warning' },
          { etiqueta: 'Egresos', datos: puntos.map((p: PuntoTendencia): number => p.egresos), color: 'danger' },
          { etiqueta: 'Utilidad', datos: puntos.map((p: PuntoTendencia): number => p.utilidad), color: 'success' }
        ];
      },
      () => this.alertas.showNotification('No se pudo cargar la tendencia', 'danger')
    ));
  }

  exportar(): void {
    descargarCsv('financiero-' + this.desde + '_' + this.hasta,
      [['Período', 'periodo'], ['Ingresos', 'ingresos'], ['Egresos', 'egresos'], ['Utilidad', 'utilidad']], this.puntos);
  }

  get proyeccionUtilidad(): number | null {
    const p = this.resumen && this.resumen.proyeccion;
    return p && !p.insuficiente && p.promedio_movil ? p.promedio_movil.utilidad : null;
  }

  /** Regresión lineal sobre 6 meses: null si no hay historia suficiente (el backend la omite con < 6 meses). */
  get proyeccionRegresion(): number | null {
    const p = this.resumen && this.resumen.proyeccion;
    return p && !p.insuficiente && p.regresion ? p.regresion.utilidad : null;
  }
}
