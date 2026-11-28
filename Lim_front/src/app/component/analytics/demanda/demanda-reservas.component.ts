import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LoginService } from '../../../services/login/login.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { SerieGrafico, RangoPeriodo } from '../../../model/analytics';
import { nuevaPaginacion } from '../../paginacion/paginacion';

interface DiaProyeccion { fecha: string; dia: string; proyectado: number; agendadas: number; capacidad: number; ocupacion: number | null; excede: boolean; }
interface Demanda {
  resumen: { reservas: number; rechazadas: number; tasa_rechazo: number; monto: number; dia_pico: string | null; servicio_top: string | null };
  mapa_calor: { horas: string[]; dias: { dia: string; valores: number[] }[] };
  ranking: { servicio_id: number; servicio: string; categoria: string; reservas: number; monto: number }[];
  temporada: { periodo: string; total: number; por_categoria: { [categoria: string]: number } }[];
  proyeccion: {
    disponible: boolean; mensaje?: string; base?: string; dias: DiaProyeccion[];
    semanas?: { desde: string; hasta: string; proyectado: number; agendadas: number; capacidad: number }[];
    alertas: { fecha: string; dia: string; demanda: number; capacidad: number; mensaje: string }[];
  };
}
interface BloqueDia { inicio: string; fin: string; cupos: number; aprobadas: number; en_proceso: number; ocupados: number; libres: number; fuera_de_horario?: boolean; }
interface ReservaDia {
  id: number; orden: number; hora: string; hora_fin: string; servicio: string; categoria: string; cliente: string; celular: string;
  cantidad: number; precio_total: number; estado: number; estado_texto: string; origen: string; fecha_creacion: string;
}
interface AgendaDia {
  fecha: string; dia: string; atiende: boolean;
  resumen: { reservas: number; ocupan_cupo: number; cupos: number };
  categorias: { id: number; nombre: string; cupos: number; ocupados: number; bloques: BloqueDia[] }[];
  reservas: ReservaDia[];
}

const PESTANAS = ['patrones', 'agenda', 'proyeccion'];
const BADGE_ESTADO: { [estado: number]: string } = { 1: 'badge-default', 2: 'badge-success', 3: 'badge-warning', 4: 'badge-danger' };

// RF-BI-05 (SCRUM-22): demanda de reservas en 3 pestañas. Patrones (período en meses), Agenda de un día concreto
// y Próximas 4 semanas (proyección vs cupos). Solo Admin (gate del backend D-153).
@Component({
  selector: 'app-demanda-reservas',
  templateUrl: './demanda-reservas.component.html'
})
export class DemandaReservasComponent implements OnInit {
  pestana = 0;
  desde = '';
  hasta = '';
  categoriaId: number = null;
  categorias: { id: number; nombre: string }[] = [];
  hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

  datos: Demanda = null;
  cargando = false;
  error = '';
  maxCalor = 0;
  etiquetasTemporada: string[] = [];
  seriesTemporada: SerieGrafico[] = [];
  etiquetasProyeccion: string[] = [];
  seriesProyeccion: SerieGrafico[] = [];

  // Detalle por día de las próximas 4 semanas: una semana (7 días) por página.
  pagSemanas = nuevaPaginacion(7);
  fechaAgenda = '';
  agenda: AgendaDia = null;
  cargandoAgenda = false;
  errorAgenda = '';
  badge = BADGE_ESTADO;

  constructor(private http: HttpClient, private loginService: LoginService, private alertas: AlertasService,
              private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const p = PESTANAS.indexOf(q.get('pestana') || '');
    this.pestana = p >= 0 ? p : 0;
    const f = q.get('fecha');
    this.fechaAgenda = f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : this.sumarDias(this.hoy, 1); // por defecto mañana: lo que hay que preparar
    const c = Number(q.get('categoria_id'));
    this.categoriaId = c > 0 ? c : null;
    this.cargar();
    if (this.pestana === 1) { this.cargarAgenda(); }
  }

  private get cabeceras(): HttpHeaders { return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }); }
  private mensaje(e: HttpErrorResponse, porDefecto: string): string {
    return (e && e.error && e.error.error && e.error.error.message) || porDefecto;
  }

  // La pestaña, el día y la categoría quedan en la URL: se puede volver o compartir la misma vista.
  private recordar(): void {
    this.router.navigate([], {
      relativeTo: this.route, replaceUrl: true,
      queryParams: { pestana: PESTANAS[this.pestana], fecha: this.pestana === 1 ? this.fechaAgenda : null, categoria_id: this.categoriaId }
    });
  }

  cambiarPestana(i: number): void {
    this.pestana = i;
    this.recordar();
    if (i === 1 && (!this.agenda || this.agenda.fecha !== this.fechaAgenda)) { this.cargarAgenda(); }
  }

  cambiarPeriodo(r: RangoPeriodo): void { this.desde = r.desde; this.hasta = r.hasta; this.cargar(); }

  cambiarCategoria(): void {
    this.recordar();
    this.cargar();
    if (this.pestana === 1) { this.cargarAgenda(); }
  }

  cargar(): void {
    let params = new HttpParams();
    if (this.desde) { params = params.set('desde', this.desde); }
    if (this.hasta) { params = params.set('hasta', this.hasta); }
    if (this.categoriaId) { params = params.set('categoria_id', String(this.categoriaId)); }
    this.cargando = true;
    this.error = '';
    this.http.get<{ data: Demanda; meta: any }>(environment.url + '/api/v1/analytics/demanda', { headers: this.cabeceras, params: params }).subscribe(
      (r) => {
        this.cargando = false;
        this.datos = r.data;
        this.desde = r.meta.desde;
        this.hasta = r.meta.hasta;
        this.categorias = r.meta.categorias || [];
        this.armarGraficos();
      },
      (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = this.mensaje(e, 'No se pudo cargar la demanda de reservas.');
        this.alertas.showNotification(this.error, 'danger');
      }
    );
  }

  cargarAgenda(): void {
    if (!this.fechaAgenda) { return; }
    let params = new HttpParams().set('fecha', this.fechaAgenda);
    if (this.categoriaId) { params = params.set('categoria_id', String(this.categoriaId)); }
    this.cargandoAgenda = true;
    this.errorAgenda = '';
    this.http.get<{ data: AgendaDia }>(environment.url + '/api/v1/analytics/demanda/dia', { headers: this.cabeceras, params: params }).subscribe(
      (r) => {
        this.cargandoAgenda = false;
        // Forma que esperan los botones Aprobar / Rechazar / Finalizar (mismos que Adm Servicios > Reservas).
        r.data.reservas.forEach((x: any) => {
          x.paraAcciones = {
            id: x.id, orden: x.orden, estado: x.estado, hora_inicio: x.hora, hora_fin: x.hora_fin,
            fecha_reserva: r.data.fecha + 'T12:00:00Z', servicio: { nombre: x.servicio }, usuario_app: { nombre: x.cliente }
          };
        });
        this.agenda = r.data;
      },
      (e: HttpErrorResponse) => { this.cargandoAgenda = false; this.errorAgenda = this.mensaje(e, 'No se pudo cargar la agenda del día.'); }
    );
  }

  irADia(ymd: string): void {
    if (!ymd) { return; }
    this.fechaAgenda = ymd;
    this.pestana = 1;
    this.recordar();
    this.cargarAgenda();
  }

  // Tras aprobar / rechazar / finalizar desde la agenda: se recarga la agenda y los indicadores.
  alCambiarReserva(): void {
    this.cargarAgenda();
    this.cargar();
  }

  moverDia(n: number): void { this.irADia(this.sumarDias(this.fechaAgenda || this.hoy, n)); }

  private armarGraficos(): void {
    const d = this.datos;
    this.maxCalor = Math.max(0, ...d.mapa_calor.dias.map((x) => Math.max(0, ...x.valores)));
    const nombres: string[] = [];
    d.temporada.forEach((t) => Object.keys(t.por_categoria).forEach((c) => { if (nombres.indexOf(c) === -1) { nombres.push(c); } }));
    this.etiquetasTemporada = d.temporada.map((t) => this.mesCorto(t.periodo));
    this.seriesTemporada = nombres.map((c) => ({ etiqueta: c, datos: d.temporada.map((t) => t.por_categoria[c] || 0) }));
    this.pagSemanas.pagina = 1; // al recargar (otra categoría) vuelve a la semana 1
    const semanas = d.proyeccion.semanas || [];
    this.etiquetasProyeccion = semanas.map((s) => this.dm(s.desde) + ' – ' + this.dm(s.hasta));
    this.seriesProyeccion = semanas.length ? [
      { etiqueta: 'Proyectadas', datos: semanas.map((s) => s.proyectado), color: 'warning' },
      { etiqueta: 'Ya agendadas', datos: semanas.map((s) => s.agendadas), color: 'success' }
    ] : [];
  }

  // Intensidad del mapa de calor con el rosa del sistema (#e91e63).
  fondo(valor: number): string {
    if (!valor || !this.maxCalor) { return 'transparent'; }
    return 'rgba(233, 30, 99, ' + (0.15 + 0.75 * valor / this.maxCalor).toFixed(2) + ')';
  }
  colorTexto(valor: number): string { return this.maxCalor && valor / this.maxCalor > 0.55 ? '#fff' : 'inherit'; }

  porcentaje(ocupados: number, cupos: number): number { return cupos ? Math.min(100, Math.round(ocupados * 100 / cupos)) : (ocupados ? 100 : 0); }
  colorBarra(ocupados: number, cupos: number): string {
    const p = cupos ? ocupados / cupos : (ocupados ? 1 : 0);
    return p >= 1 ? 'bg-danger' : p >= 0.75 ? 'bg-warning' : 'bg-success';
  }

  nombreCategoria(): string {
    const c = this.categorias.find((x) => x.id === this.categoriaId);
    return c ? c.nombre : 'todas las categorías';
  }

  textoFecha(ymd: string): string {
    if (!ymd) { return ''; }
    const p = ymd.split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + ' ' + p[2] + ' de ' + meses[p[1] - 1] + ' de ' + p[0];
  }
  mesCorto(periodo: string): string {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return meses[Number(periodo.slice(5, 7)) - 1] + ' ' + periodo.slice(2, 4);
  }
  dm(ymd: string): string { return ymd ? ymd.slice(8, 10) + '/' + ymd.slice(5, 7) : ''; }
  sumarDias(ymd: string, n: number): string {
    const p = ymd.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
}
