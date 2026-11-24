import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';
import { PevMasivaService } from '../../../services/pev-masiva/pev-masiva.service';
import { PevAsignacionesService } from '../../../services/pev-asignaciones/pev-asignaciones.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OpcionSimple } from '../../../model/pev-masiva';
import { AsignacionPev, LineaCumplimiento } from '../../../model/pev-asignaciones';
import { mostrarErrorBodega as mostrarError } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-PEV-02 (AUT-016, obs. 12 / SCRUM-17): ver las asignaciones de una actividad, quitar a un trabajador (cerrar con
// fecha, sin borrar) y ver su historial de cumplimiento, que se conserva aunque la asignación esté cerrada.
@Component({
  selector: 'app-asignaciones-actividad',
  templateUrl: './asignaciones-actividad.component.html'
})
export class AsignacionesActividadComponent implements OnInit {
  clientes: OpcionSimple[] = [];
  actividades: OpcionSimple[] = [];
  clienteId: number = null;
  actividadId: number = null;
  asignaciones: AsignacionPev[] = [];
  cargando = false;
  verAnuladas = false;
  seleccionada: AsignacionPev = null;
  cumplimiento: LineaCumplimiento[] = [];
  cargandoCumplimiento = false;

  constructor(private pevMasiva: PevMasivaService, private servicio: PevAsignacionesService,
    private alertas: AlertasService, private loginService: LoginService) {}

  ngOnInit() {
    this.pevMasiva.clientes().subscribe(
      (r) => { this.clientes = r.data.clientes; },
      (e: HttpErrorResponse) => mostrarError(e, this.alertas, this.loginService)
    );
  }

  elegirCliente() {
    this.actividades = [];
    this.actividadId = null;
    this.asignaciones = [];
    this.seleccionada = null;
    if (!this.clienteId) { return; }
    this.pevMasiva.opcionesCliente(this.clienteId).subscribe(
      (r) => { this.actividades = r.data.actividades; },
      (e: HttpErrorResponse) => mostrarError(e, this.alertas, this.loginService)
    );
  }

  cargar() {
    this.asignaciones = [];
    this.seleccionada = null;
    if (!this.actividadId) { return; }
    this.cargando = true;
    this.servicio.deActividad(this.actividadId).subscribe(
      (r) => { this.asignaciones = r.data; this.cargando = false; },
      (e: HttpErrorResponse) => { this.cargando = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  visibles(): AsignacionPev[] {
    return this.asignaciones.filter((a) => this.verAnuladas || a.estado !== 'ANULADA');
  }

  activas(): number {
    return this.asignaciones.filter((a) => a.estado === 'ACTIVA').length;
  }

  nombre(a: AsignacionPev): string {
    return a.trabajador ? (a.trabajador.nombre + ' ' + a.trabajador.apellido) : ('Trabajador #' + a.trabajador_id);
  }

  // Quitar = cerrar la asignación con fecha de término (>= inicio). No se borra nada y el historial se conserva.
  quitar(a: AsignacionPev) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    const inicial = hoy < a.fecha_desde ? a.fecha_desde : hoy;
    // SweetAlert2 10 no trae input de fecha: se usa un <input type="date"> propio y se lee en preConfirm.
    swal.fire({
      title: 'Quitar a ' + this.escapar(this.nombre(a)),
      html: 'La asignación queda <b>cerrada</b> desde la fecha indicada (no se borra y su historial se conserva).<br>' +
        'Las demás asignaciones de la actividad no cambian.<br><br>' +
        '<label for="fecha-quitar">Fecha de término</label><br>' +
        '<input id="fecha-quitar" type="date" class="swal2-input" min="' + a.fecha_desde + '" value="' + inicial + '">',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const v = (document.getElementById('fecha-quitar') as HTMLInputElement).value;
        if (!v) { swal.showValidationMessage('Indica la fecha de término'); return false; }
        if (v < a.fecha_desde) { swal.showValidationMessage('No puede ser anterior al inicio (' + a.fecha_desde + ')'); return false; }
        return v;
      }
    }).then((res) => {
      if (!res.value) { return; }
      this.servicio.cerrar(a.id, String(res.value)).subscribe(
        () => {
          this.alertas.alertaExitoMsj('Trabajador quitado', 'La asignación quedó cerrada; las demás siguen activas.');
          this.cargar();
        },
        (e: HttpErrorResponse) => mostrarError(e, this.alertas, this.loginService)
      );
    });
  }

  verCumplimiento(a: AsignacionPev) {
    this.seleccionada = a;
    this.cumplimiento = [];
    this.cargandoCumplimiento = true;
    this.servicio.cumplimiento(a.id).subscribe(
      (r) => { this.cumplimiento = r.data; this.cargandoCumplimiento = false; },
      (e: HttpErrorResponse) => { this.cargandoCumplimiento = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  private escapar(texto: string): string {
    return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' } as any)[c]);
  }

  marcados(l: LineaCumplimiento): string {
    if (l.pasos) { return l.pasos.filter((p) => p.marcado === 1).length + ' / 3 pasos'; }
    if (l.rondas) { return l.rondas.filter((r) => !!r.hora).length + ' / 3 rondas'; }
    return '—';
  }
}
