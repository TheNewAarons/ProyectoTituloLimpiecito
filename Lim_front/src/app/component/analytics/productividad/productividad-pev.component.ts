import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FilaProductividadSector, FilaProductividadSupervisor, FilaProductividadTrabajador, FiltrosProductividad, RangoPeriodo, SerieGrafico
} from '../../../model/analytics';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { generarMeses, idDesdeQuery, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';
import { Columna, descargarCsv } from '../compartido/csv';
import { nuevaPaginacion } from '../../paginacion/paginacion';

// RF-BI-04: productividad PEV — cumplimiento por trabajador, verificación por supervisor y observaciones por sector (D-BI-04-1..4).
@Component({
  selector: 'app-productividad-pev',
  templateUrl: './productividad-pev.component.html'
})
export class ProductividadPevComponent implements OnInit, OnDestroy {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagTrabajadores = nuevaPaginacion();
  pagSupervisores = nuevaPaginacion();
  pagSectores = nuevaPaginacion();
  static readonly COLUMNAS: { [vista: string]: Columna[] } = {
    trabajadores: [['Trabajador', 'nombre'], ['N° empleado', 'n_empleado'], ['Días', 'dias'], ['Tareas', 'tareas'],
      ['Pasos asignados', 'pasos_asignados'], ['Pasos marcados', 'pasos_marcados'], ['Cumplimiento %', 'cumplimiento_pct']],
    supervisores: [['#', 'posicion'], ['Supervisor', 'nombre'], ['N° empleado', 'n_empleado'], ['Listas', 'listas'],
      ['Listas firmadas', 'listas_firmadas'], ['Tareas', 'tareas'], ['Rondas verificadas', 'rondas_verificadas'],
      ['Rondas asignadas', 'rondas_asignadas'], ['Verificación %', 'verificacion_pct']],
    sectores: [['Sector', 'sector'], ['Cliente', 'cliente'], ['Tareas', 'tareas'], ['Cumplimiento %', 'cumplimiento_pct'],
      ['Observaciones', 'observaciones'], ['Obs. trabajador', 'observaciones_trabajador'], ['Obs. supervisor', 'observaciones_supervisor']]
  };

  hasta = mesActualSantiago();
  desde = generarMeses(this.hasta, 3)[2];
  clienteId: number | null = null;
  supervisor: number | null = null;

  trabajadores: FilaProductividadTrabajador[] = [];
  supervisores: FilaProductividadSupervisor[] = [];
  sectores: FilaProductividadSector[] = [];
  cumplimiento: number | null = null;
  verificacion: number | null = null;
  verificacionTotal: number | null = null; // total del período (KPI sin filtro de supervisor, obs. 1)
  observaciones: number | null = null;
  etiquetas: string[] = [];
  series: SerieGrafico[] = [];
  cargando = true;
  private subRanking: Subscription | null = null;
  private subsFiltradas: Subscription[] = [];
  private alertaMostrada = false;

  constructor(private analyticsService: AnalyticsService, private alertas: AlertasService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const rango = rangoDesdeQuery(this.route.snapshot.queryParamMap);
    this.clienteId = idDesdeQuery(this.route.snapshot.queryParamMap, 'cliente_id');
    if (rango) {
      this.desde = rango.desde;
      this.hasta = rango.hasta;
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    this.cancelarFiltradas();
    if (this.subRanking) this.subRanking.unsubscribe();
  }

  cambiarPeriodo(rango: RangoPeriodo): void {
    this.desde = rango.desde;
    this.hasta = rango.hasta;
    this.cargar();
  }

  cambiarCliente(id: number | null): void {
    this.clienteId = id;
    this.supervisor = null; // las opciones de supervisor dependen del cliente
    this.cargar();
  }

  private filtros(conSupervisor: boolean): FiltrosProductividad {
    return { desde: this.desde, hasta: this.hasta, clienteId: this.clienteId, supervisor: conSupervisor ? this.supervisor : null };
  }

  private cancelarFiltradas(): void {
    this.subsFiltradas.forEach((s: Subscription) => s.unsubscribe());
    this.subsFiltradas = [];
  }

  /** Contador de respuestas pendientes; si varias fallan, una sola alerta. */
  private seguimiento(pendientes: number): { listo: () => void, error: () => void } {
    this.cargando = true;
    this.alertaMostrada = false;
    const listo = () => { pendientes--; if (pendientes <= 0) this.cargando = false; };
    const error = () => {
      listo();
      if (!this.alertaMostrada) { this.alertaMostrada = true; this.alertas.alertaErrorMsj('No se pudo cargar la productividad PEV'); }
    };
    return { listo: listo, error: error };
  }

  cargar(): void {
    // Cambios rápidos de filtro: solo vale la última respuesta.
    this.cancelarFiltradas();
    if (this.subRanking) this.subRanking.unsubscribe();
    const s = this.seguimiento(3);
    // El ranking de supervisores muestra a todos (y alimenta el selector); el filtro de supervisor aplica a trabajadores y sectores.
    this.subRanking = this.analyticsService.productividad<FilaProductividadSupervisor[]>('supervisores', this.filtros(false)).subscribe((r) => {
      this.supervisores = r.data;
      this.verificacionTotal = r.meta.verificacion_pct === undefined ? null : r.meta.verificacion_pct;
      this.actualizarVerificacion();
      s.listo();
    }, s.error);
    this.cargarFiltradas(s.listo, s.error);
  }

  cambiarSupervisor(): void {
    // El ranking no depende del supervisor: si sigue cargando, se deja terminar.
    this.actualizarVerificacion();
    this.cancelarFiltradas();
    const s = this.seguimiento(2);
    this.cargarFiltradas(s.listo, s.error);
  }

  // Obs. 1 (AUT-012): con un supervisor elegido, el KPI Verificación es el de su fila del ranking (el ranking trae a todos);
  // sin supervisor, el total del período.
  actualizarVerificacion(): void {
    if (this.supervisor === null || this.supervisor === undefined) {
      this.verificacion = this.verificacionTotal;
      return;
    }
    const fila = this.supervisores.filter((f: FilaProductividadSupervisor) => String(f.n_empleado) === String(this.supervisor))[0];
    this.verificacion = fila && fila.verificacion_pct !== undefined ? fila.verificacion_pct : null;
  }

  private cargarFiltradas(listo: () => void, error: () => void): void {
    this.subsFiltradas.push(this.analyticsService.productividad<FilaProductividadTrabajador[]>('trabajadores', this.filtros(true)).subscribe((r) => {
      this.trabajadores = r.data;
      this.cumplimiento = r.meta.cumplimiento_pct === undefined ? null : r.meta.cumplimiento_pct;
      this.etiquetas = r.data.map((f: FilaProductividadTrabajador): string => f.nombre);
      this.series = [{ etiqueta: 'Cumplimiento %', datos: r.data.map((f: FilaProductividadTrabajador): number => f.cumplimiento_pct || 0) }];
      listo();
    }, error));
    this.subsFiltradas.push(this.analyticsService.productividad<FilaProductividadSector[]>('sectores', this.filtros(true)).subscribe((r) => {
      this.sectores = r.data;
      this.observaciones = r.meta.observaciones === undefined ? null : r.meta.observaciones;
      listo();
    }, error));
  }

  exportar(vista: 'trabajadores' | 'supervisores' | 'sectores'): void {
    const filas: object[] = { trabajadores: this.trabajadores, supervisores: this.supervisores, sectores: this.sectores }[vista];
    descargarCsv('productividad-pev-' + vista + '-' + this.desde + '_' + this.hasta, ProductividadPevComponent.COLUMNAS[vista], filas);
  }
}
