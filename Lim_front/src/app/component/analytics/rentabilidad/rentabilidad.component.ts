import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import {
  DetalleRentabilidad, FilaGastosGenerales, FilaRentabilidad, MetaRentabilidad, RangoPeriodo, SerieGrafico
} from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, idDesdeQuery, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';

// RF-BI-02: Rentabilidad por cliente / centro de costo. Rango por defecto: últimos 3 meses. El detalle se abre en la misma página.
@Component({
  selector: 'app-rentabilidad',
  templateUrl: './rentabilidad.component.html'
})
export class RentabilidadComponent implements OnInit {
  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 3)[2];
  filas: FilaRentabilidad[] = [];
  gastos: FilaGastosGenerales | null = null;
  meta: MetaRentabilidad | null = null;
  cargando = true;
  private centroInicial: number | null = null; // centro elegido en el inicio de Analytics
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  detalle: DetalleRentabilidad | null = null;
  cargandoDetalle = false;

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const rango = rangoDesdeQuery(this.route.snapshot.queryParamMap);
    this.centroInicial = idDesdeQuery(this.route.snapshot.queryParamMap, 'centro_costo_id');
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
    this.detalle = null;
    this.analyticsService.rentabilidad(this.desde, this.hasta).subscribe(
      (r) => {
        this.filas = r.data.filter((f): f is FilaRentabilidad => f.tipo === 'CLIENTE');
        this.gastos = r.data.find((f): f is FilaGastosGenerales => f.tipo === 'GASTOS_GENERALES') || null;
        this.meta = r.meta;
        const top = this.filas.slice().sort((a: FilaRentabilidad, b: FilaRentabilidad): number => b.margen - a.margen).slice(0, 10);
        this.etiquetas = top.map((f: FilaRentabilidad): string => f.cliente);
        this.series = [{ etiqueta: 'Margen', datos: top.map((f: FilaRentabilidad): number => f.margen) }];
        this.cargando = false;
        if (this.centroInicial) {
          this.verDetalle(this.centroInicial);
          this.centroInicial = null;
        }
      },
      () => {
        this.cargando = false;
        this.alertas.alertaErrorMsj('No se pudo cargar la rentabilidad');
      }
    );
  }

  verDetalle(centroCostoId: number): void {
    this.cargandoDetalle = true;
    this.analyticsService.rentabilidadDetalle(centroCostoId, this.desde, this.hasta).subscribe(
      (r) => {
        this.detalle = r.data;
        this.cargandoDetalle = false;
      },
      () => {
        this.cargandoDetalle = false;
        this.alertas.alertaErrorMsj('No se pudo cargar el detalle del centro');
      }
    );
  }

  esEstimado(f: FilaRentabilidad): boolean {
    return f.origen_ingreso === 'CONTRATO_ESTIMADO' || f.origen_ingreso === 'MIXTO';
  }
}
