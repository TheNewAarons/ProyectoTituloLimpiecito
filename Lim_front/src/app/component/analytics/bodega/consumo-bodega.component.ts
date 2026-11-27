import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FilaConsumoGrupo, FilaConsumoMes, FilaFrecuenciaCompra, FilaMerma, FilaStockCritico, MetaMerma, FilaTopProducto, RangoPeriodo, SerieGrafico
} from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';
import { Columna, descargarCsv } from '../compartido/csv';
import { nuevaPaginacion } from '../../paginacion/paginacion';

type PestanaBodega = 'consumo' | 'compras' | 'merma' | 'critico';

// RF-BI-03: consumo de bodega. Solicitado = lo pedido; consumido = lo entregado (D-BI-03-1). Rango por defecto: últimos 6 meses.
@Component({
  selector: 'app-consumo-bodega',
  templateUrl: './consumo-bodega.component.html'
})
export class ConsumoBodegaComponent implements OnInit, OnDestroy {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagTop = nuevaPaginacion();
  pagGrupos = nuevaPaginacion();
  pagFrecuencia = nuevaPaginacion();
  pagMerma = nuevaPaginacion();
  pagCritico = nuevaPaginacion();
  static readonly COLUMNAS: { [vista: string]: Columna[] } = {
    top: [['#', 'posicion'], ['Producto', 'producto'], ['Solicitado', 'cantidad_pedida'], ['Entregado', 'cantidad_entregada'],
      ['Solicitudes', 'solicitudes']],
    frecuencia: [['Producto', 'producto'], ['Órdenes', 'ordenes'], ['Unidades', 'cantidad'], ['Cada (días)', 'dias_promedio_entre_compras'],
      ['Última compra', 'ultima_compra']],
    merma: [['Producto', 'producto'], ['Recibido', 'recibido'], ['Rechazado', 'rechazado'], ['% Merma', 'porcentaje_merma'],
      ['Costo merma', 'costo_merma'], ['Recepciones con rechazo', 'recepciones_con_rechazo'], ['Último motivo', 'ultimo_motivo']],
    critico: [['Producto', 'producto'], ['Stock', 'stock'], ['Mínimo', 'stock_minimo'], ['Faltante', 'faltante']]
  };
  private subs = new Subscription();
  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 6)[5];
  productoId: number | null = null;
  agrupar: 'supervisor' | 'centro_costo' = 'supervisor';
  // Secciones del dashboard (todas se cargan juntas; la pestaña solo elige qué se ve)
  pestanas: { id: PestanaBodega, etiqueta: string, icono: string }[] = [
    { id: 'consumo', etiqueta: 'Consumo', icono: 'local_shipping' },
    { id: 'compras', etiqueta: 'Compras', icono: 'shopping_cart' },
    { id: 'merma', etiqueta: 'Merma', icono: 'remove_shopping_cart' },
    { id: 'critico', etiqueta: 'Stock crítico', icono: 'warning' }
  ];
  pestana: PestanaBodega = 'consumo';

  top: FilaTopProducto[] = [];
  grupos: FilaConsumoGrupo[] = [];
  frecuencia: FilaFrecuenciaCompra[] = [];
  critico: FilaStockCritico[] = [];
  // RF-BOD-04: merma de recepciones
  merma: FilaMerma[] = [];
  metaMerma: MetaMerma | null = null;
  etiquetasMerma: string[] = [];
  seriesMerma: SerieGrafico[] = [];
  totalEntregado: number | null = null;
  solicitudesEntregadas: number | null = null;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  cargando = true;
  private subMensual: Subscription | null = null;
  private subGrupos: Subscription | null = null;

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const rango = rangoDesdeQuery(this.route.snapshot.queryParamMap);
    const pestana = this.route.snapshot.queryParamMap.get('pestana'); // ?pestana=critico desde la alerta del inicio
    if (this.pestanas.some((p: { id: PestanaBodega }) => p.id === pestana)) {
      this.pestana = pestana as PestanaBodega;
    }
    if (rango) {
      this.desde = rango.desde;
      this.hasta = rango.hasta;
    }
    this.cargar();
  }

  cambiarPeriodo(rango: RangoPeriodo): void {
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.productoId = null; // el selector sale del ranking del período: el producto elegido podría no estar en el nuevo
    this.cargar();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.subMensual) { this.subMensual.unsubscribe(); }
    if (this.subGrupos) { this.subGrupos.unsubscribe(); }
  }

  cargar(): void {
    // Cambios rápidos de período: solo vale la última respuesta (mensual y grupos se cancelan en sus propios métodos).
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.cargando = true;
    let pendientes = 5;
    const listo = () => { pendientes--; if (pendientes === 0) this.cargando = false; };
    const error = (msj: string) => () => { listo(); this.alertas.showNotification(msj, 'danger'); };
    this.subs.add(this.analyticsService.topProductosBodega(this.desde, this.hasta, 20).subscribe((r) => { this.top = r.data; listo(); }, error('No se pudo cargar el ranking de productos')));
    this.cargarMensual(listo, error);
    this.cargarGrupos(listo, error);
    this.subs.add(this.analyticsService.frecuenciaCompraBodega(this.desde, this.hasta).subscribe((r) => { this.frecuencia = r.data; listo(); }, error('No se pudo cargar la frecuencia de compra')));
    this.subs.add(this.analyticsService.mermaBodega(this.desde, this.hasta).subscribe((r) => {
      this.merma = r.data;
      this.metaMerma = r.meta;
      this.etiquetasMerma = r.meta.por_mes.map((f): string => f.periodo);
      this.seriesMerma = [{ etiqueta: 'Unidades rechazadas', datos: r.meta.por_mes.map((f): number => f.rechazado) }];
      listo();
    }, error('No se pudo cargar la merma de recepciones')));
    // Stock crítico es el estado actual: no depende del período, pero se refresca junto con el resto.
    this.subs.add(this.analyticsService.stockCriticoBodega().subscribe((r) => { this.critico = r.data; }, () => this.alertas.showNotification('No se pudo cargar el stock crítico', 'danger')));
  }

  cambiarProducto(): void {
    this.cargarMensual(() => {}, (msj: string) => () => this.alertas.showNotification(msj, 'danger'));
  }

  cambiarAgrupacion(): void {
    this.cargarGrupos(() => {}, (msj: string) => () => this.alertas.showNotification(msj, 'danger'));
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

  exportar(vista: 'top' | 'frecuencia' | 'merma' | 'critico'): void {
    const filas: object[] = { top: this.top, frecuencia: this.frecuencia, merma: this.merma, critico: this.critico }[vista];
    // Stock crítico es el estado actual (no depende del rango).
    const sufijo = vista === 'critico' ? mesActualSantiago() : this.desde + '_' + this.hasta;
    descargarCsv('bodega-' + vista + '-' + sufijo, ConsumoBodegaComponent.COLUMNAS[vista], filas);
  }
}
