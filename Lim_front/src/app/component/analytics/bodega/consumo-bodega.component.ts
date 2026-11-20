import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FilaConsumoGrupo, FilaConsumoMes, FilaFrecuenciaCompra, FilaStockCritico, FilaTopProducto, RangoPeriodo, SerieGrafico
} from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, mesActualSantiago } from '../compartido/filtro-periodo/filtro-periodo.component';

// RF-BI-03: consumo de bodega. Solicitado = lo pedido; consumido = lo entregado (D-BI-03-1). Rango por defecto: últimos 6 meses.
@Component({
  selector: 'app-consumo-bodega',
  templateUrl: './consumo-bodega.component.html'
})
export class ConsumoBodegaComponent implements OnInit {
  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 6)[5];
  productoId: number | null = null;
  agrupar: 'supervisor' | 'centro_costo' = 'supervisor';

  top: FilaTopProducto[] = [];
  grupos: FilaConsumoGrupo[] = [];
  frecuencia: FilaFrecuenciaCompra[] = [];
  critico: FilaStockCritico[] = [];
  totalEntregado: number | null = null;
  solicitudesEntregadas: number | null = null;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  cargando = true;
  private subMensual: Subscription | null = null;
  private subGrupos: Subscription | null = null;

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cambiarPeriodo(rango: RangoPeriodo): void {
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.productoId = null; // el selector sale del ranking del período: el producto elegido podría no estar en el nuevo
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    let pendientes = 4;
    const listo = () => { pendientes--; if (pendientes === 0) this.cargando = false; };
    const error = (msj: string) => () => { listo(); this.alertas.alertaErrorMsj(msj); };
    this.analyticsService.topProductosBodega(this.desde, this.hasta, 20).subscribe((r) => { this.top = r.data; listo(); }, error('No se pudo cargar el ranking de productos'));
    this.cargarMensual(listo, error);
    this.cargarGrupos(listo, error);
    this.analyticsService.frecuenciaCompraBodega(this.desde, this.hasta).subscribe((r) => { this.frecuencia = r.data; listo(); }, error('No se pudo cargar la frecuencia de compra'));
    // Stock crítico es el estado actual: no depende del período, pero se refresca junto con el resto.
    this.analyticsService.stockCriticoBodega().subscribe((r) => { this.critico = r.data; }, () => this.alertas.alertaErrorMsj('No se pudo cargar el stock crítico'));
  }

  cambiarProducto(): void {
    this.cargarMensual(() => {}, (msj: string) => () => this.alertas.alertaErrorMsj(msj));
  }

  cambiarAgrupacion(): void {
    this.cargarGrupos(() => {}, (msj: string) => () => this.alertas.alertaErrorMsj(msj));
  }

  private cargarMensual(listo: () => void, error: (msj: string) => () => void): void {
    // Cambios rápidos de producto: solo vale la última respuesta.
    if (this.subMensual) this.subMensual.unsubscribe();
    this.subMensual = this.analyticsService.consumoBodega<FilaConsumoMes[]>('mes', this.desde, this.hasta, this.productoId).subscribe(
      (r) => {
        this.etiquetas = r.data.map((f: FilaConsumoMes): string => f.periodo);
        this.series = [{ etiqueta: 'Unidades entregadas', datos: r.data.map((f: FilaConsumoMes): number => f.cantidad) }];
        this.totalEntregado = r.meta.total;
        this.solicitudesEntregadas = r.data.reduce((a: number, f: FilaConsumoMes): number => a + f.solicitudes, 0);
        listo();
      },
      error('No se pudo cargar el consumo mensual')
    );
  }

  private cargarGrupos(listo: () => void, error: (msj: string) => () => void): void {
    if (this.subGrupos) this.subGrupos.unsubscribe();
    this.subGrupos = this.analyticsService.consumoBodega<FilaConsumoGrupo[]>(this.agrupar, this.desde, this.hasta).subscribe(
      (r) => { this.grupos = r.data; listo(); },
      error('No se pudo cargar el consumo por ' + (this.agrupar === 'supervisor' ? 'supervisor' : 'centro de costo'))
    );
  }

  nombreProductoElegido(): string {
    const p = this.top.find((f: FilaTopProducto): boolean => f.producto_id === Number(this.productoId));
    return p ? p.producto : 'todos los productos';
  }
}
