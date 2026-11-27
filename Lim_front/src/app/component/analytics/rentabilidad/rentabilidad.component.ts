import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  DetalleRentabilidad, FilaGastosGenerales, FilaRentabilidad, MetaRentabilidad, RangoPeriodo, SerieGrafico
} from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, idDesdeQuery, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';
import { descargarCsv } from '../compartido/csv';
import { nuevaPaginacion } from '../../paginacion/paginacion';

// RF-BI-02: Rentabilidad por cliente / centro de costo. Rango por defecto: últimos 3 meses. El detalle se abre en la misma página.
@Component({
  selector: 'app-rentabilidad',
  templateUrl: './rentabilidad.component.html'
})
export class RentabilidadComponent implements OnInit, OnDestroy {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagFilas = nuevaPaginacion();
  pagPeriodos = nuevaPaginacion();
  private subCarga: Subscription | null = null;
  private subDetalle: Subscription | null = null;
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

  ngOnDestroy(): void {
    if (this.subCarga) { this.subCarga.unsubscribe(); }
    if (this.subDetalle) { this.subDetalle.unsubscribe(); }
  }

  cargar(): void {
    // Cambios rápidos de período: solo vale la última respuesta (también la del detalle, que depende del rango).
    if (this.subCarga) { this.subCarga.unsubscribe(); }
    if (this.subDetalle) { this.subDetalle.unsubscribe(); }
    this.cargandoDetalle = false;
    this.cargando = true;
    this.detalle = null;
    this.subCarga = this.analyticsService.rentabilidad(this.desde, this.hasta).subscribe(
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
    if (this.subDetalle) { this.subDetalle.unsubscribe(); }
    this.cargandoDetalle = true;
    this.subDetalle = this.analyticsService.rentabilidadDetalle(centroCostoId, this.desde, this.hasta).subscribe(
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

  exportar(): void {
    const filas = this.filas.map((f: FilaRentabilidad) => Object.assign({}, f, {
      centros: f.centros.map((c: { numero_cc: string | number }) => 'CC ' + c.numero_cc).join(', ')
    }));
    descargarCsv('rentabilidad-' + this.desde + '_' + this.hasta, [['#', 'posicion'], ['Cliente', 'cliente'], ['Centros', 'centros'],
      ['Ingreso real', 'ingreso_real'], ['Ingreso estimado', 'ingreso_estimado'], ['Costo sueldos', 'costo_sueldos'],
      ['Costo bodega', 'costo_bodega'], ['Otros costos', 'costo_otros'], ['Costo total', 'costo_total'], ['Margen', 'margen'],
      ['Margen %', 'margen_pct'], ['Origen ingreso', 'origen_ingreso']], filas);
  }

  esEstimado(f: FilaRentabilidad): boolean {
    return f.origen_ingreso === 'CONTRATO_ESTIMADO' || f.origen_ingreso === 'MIXTO';
  }
}
