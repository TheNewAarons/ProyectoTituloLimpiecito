import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { LoginService } from '../../../services/login/login.service';
import { FilaGastosGenerales, FilaRentabilidad, PuntoTendencia, ResumenFinanciero, SerieGrafico } from '../../../model/analytics';
import { generarMeses, mesActualSantiago } from '../compartido/filtro-periodo/filtro-periodo.component';
import { Variacion, variacionMensual } from '../compartido/csv';

// RF-BI-01a: inicio de Analytics = resumen del mes + una tarjeta por tablero. Los datos financieros
// solo los pide el Administrador (el backend responde 403 a Operaciones). Cada dato falla por separado.
@Component({
  selector: 'app-analytics-inicio',
  templateUrl: './analytics-inicio.component.html'
})
export class AnalyticsInicioComponent implements OnInit, OnDestroy {
  readonly hasta = mesActualSantiago();
  readonly desde = generarMeses(this.hasta, 3)[2];
  private readonly desdeTendencia = generarMeses(this.hasta, 6)[5];

  esAdmin = false;
  cargando = true;
  resumen: ResumenFinanciero | null = null;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  variaciones: { ingresos: Variacion | null, egresos: Variacion | null, utilidad: Variacion | null } =
    { ingresos: null, egresos: null, utilidad: null };
  topCliente: FilaRentabilidad | null = null;
  clientesEnPerdida: number | null = null;
  stockCritico: number | null = null;
  porcentajeMerma: number | null = null;
  cumplimiento: number | null = null;

  private destroy$ = new Subject<void>();

  constructor(private analyticsService: AnalyticsService, private loginService: LoginService) {}

  ngOnInit(): void {
    const usuario = this.loginService.obtenerDatosUsuario();
    this.esAdmin = !!(usuario && usuario.role && usuario.role.nombre === 'Administrador');

    this.pedir(this.analyticsService.stockCriticoBodega().pipe(map((r) => r.data.length)))
      .subscribe((n: number | null) => this.stockCritico = n);
    this.pedir(this.analyticsService.mermaBodega(this.desde, this.hasta).pipe(map((r) => r.meta.porcentaje_merma)))
      .subscribe((p: number | null) => this.porcentajeMerma = p);
    this.pedir(this.analyticsService.productividad('trabajadores', { desde: this.desde, hasta: this.hasta }).pipe(
      map((r) => r.meta.cumplimiento_pct === undefined ? null : r.meta.cumplimiento_pct)
    )).subscribe((p: number | null) => this.cumplimiento = p);

    if (!this.esAdmin) {
      this.cargando = false;
      return;
    }
    this.pedir(this.analyticsService.resumenFinanciero(this.hasta).pipe(map((r) => r.data)))
      .subscribe((r: ResumenFinanciero | null) => { this.resumen = r; this.cargando = false; });
    this.pedir(this.analyticsService.tendenciaFinanciera(this.desdeTendencia, this.hasta).pipe(map((r) => r.data)))
      .subscribe((puntos: PuntoTendencia[] | null) => {
        if (!puntos) { return; }
        this.etiquetas = puntos.map((p: PuntoTendencia): string => p.periodo);
        this.variaciones = {
          ingresos: variacionMensual(puntos, (p: PuntoTendencia): number => p.ingresos),
          egresos: variacionMensual(puntos, (p: PuntoTendencia): number => p.egresos),
          utilidad: variacionMensual(puntos, (p: PuntoTendencia): number => p.utilidad)
        };
        this.series = [
          { etiqueta: 'Ingresos', datos: puntos.map((p: PuntoTendencia): number => p.ingresos), color: 'warning' },
          { etiqueta: 'Egresos', datos: puntos.map((p: PuntoTendencia): number => p.egresos), color: 'danger' },
          { etiqueta: 'Utilidad', datos: puntos.map((p: PuntoTendencia): number => p.utilidad), color: 'success' }
        ];
      });
    this.pedir(this.analyticsService.rentabilidad(this.desde, this.hasta)).subscribe((r) => {
      if (!r) { return; }
      // Ya viene ordenado por margen_con_estimado desc; la fila de gastos generales no es un cliente.
      this.topCliente = (r.data.filter((f: FilaRentabilidad | FilaGastosGenerales) => f.tipo === 'CLIENTE')[0] as FilaRentabilidad) || null;
      this.clientesEnPerdida = r.meta.totales.clientes_en_perdida;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Un tablero sin datos o con error no bloquea el resto: muestra "Sin datos".
  private pedir<T>(fuente: Observable<T>): Observable<T | null> {
    return fuente.pipe(catchError(() => of(null)), takeUntil(this.destroy$));
  }
}
