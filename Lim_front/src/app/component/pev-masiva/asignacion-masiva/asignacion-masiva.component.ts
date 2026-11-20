import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { PevMasivaService } from '../../../services/pev-masiva/pev-masiva.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OpcionSimple, OpcionesCliente, PlanAsignacion, TrabajadorPev, ETIQUETA_RESULTADO } from '../../../model/pev-masiva';
import { mostrarErrorBodega as mostrarError } from '../../solicitudes-bodega/solicitudes-bodega.errores';

interface FilaTrabajador {
  trabajador: TrabajadorPev;
  seleccionado: boolean;
  area_id: number | null;
}

// RF-PEV-01: el administrador crea o elige una actividad y la asigna a varios trabajadores (un área por trabajador)
// en una sola acción, con vista previa (D-PEV-01-1..4).
@Component({
  selector: 'app-asignacion-masiva',
  templateUrl: './asignacion-masiva.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class AsignacionMasivaComponent implements OnInit {
  static readonly TOPE = 500;

  clientes: OpcionSimple[] = [];
  clienteId: number = null;
  opciones: OpcionesCliente = null;
  modoActividad: 'existente' | 'nueva' = 'existente';
  actividadId: number = null;
  actividadNombre = '';
  turnoId: number = null;
  fechaDesde = '';
  areaTodos: number = null;
  filtro = '';
  filas: FilaTrabajador[] = [];
  plan: PlanAsignacion = null;
  cargando = false;
  enviando = false;
  etiqueta = ETIQUETA_RESULTADO;

  constructor(private pev: PevMasivaService, private alertas: AlertasService, private loginService: LoginService) {}

  ngOnInit() {
    this.fechaDesde = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    this.pev.clientes().subscribe(
      (r) => { this.clientes = r.data.clientes; },
      (e: HttpErrorResponse) => mostrarError(e, this.alertas, this.loginService)
    );
  }

  elegirCliente() {
    this.opciones = null;
    this.plan = null;
    this.filas = [];
    this.actividadId = null;
    this.turnoId = null;
    this.areaTodos = null;
    if (!this.clienteId) return;
    this.cargando = true;
    this.pev.opcionesCliente(this.clienteId).subscribe(
      (r) => {
        this.cargando = false;
        this.opciones = r.data;
        this.filas = r.data.trabajadores.map((t) => ({ trabajador: t, seleccionado: false, area_id: null }));
        if (r.data.turnos.length === 1) this.turnoId = r.data.turnos[0].id;
      },
      (e: HttpErrorResponse) => { this.cargando = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  visibles(): FilaTrabajador[] {
    const f = this.filtro.trim().toLowerCase();
    if (!f) return this.filas;
    return this.filas.filter((x) => (x.trabajador.nombre + ' ' + x.trabajador.apellido + ' ' + x.trabajador.rut + ' ' + x.trabajador.n_empleado).toLowerCase().indexOf(f) !== -1);
  }

  seleccionados(): FilaTrabajador[] {
    return this.filas.filter((x) => x.seleccionado);
  }

  todosVisiblesSeleccionados(): boolean {
    const v = this.visibles();
    return v.length > 0 && v.every((x) => x.seleccionado);
  }

  seleccionarVisibles(valor: boolean) {
    this.visibles().forEach((x) => { x.seleccionado = valor; });
    this.plan = null;
  }

  aplicarAreaATodos() {
    if (!this.areaTodos) return;
    this.seleccionados().forEach((x) => { x.area_id = Number(this.areaTodos); });
    this.plan = null;
  }

  nombreTrabajador(id: number): string {
    const f = this.filas.find((x) => x.trabajador.id === id);
    return f ? f.trabajador.nombre + ' ' + f.trabajador.apellido : '#' + id;
  }

  nombreArea(id: number): string {
    const a = this.opciones ? this.opciones.areas.find((x) => x.id === id) : null;
    return a ? a.sector + ' / ' + a.nombre : '#' + id;
  }

  // Motivo por el que aún no se puede pedir la vista previa (null = se puede).
  faltante(): string {
    if (!this.clienteId) return 'Elija un cliente';
    if (this.modoActividad === 'existente' && !this.actividadId) return 'Elija una actividad';
    if (this.modoActividad === 'nueva' && !this.actividadNombre.trim()) return 'Escriba el nombre de la actividad nueva';
    if (!this.turnoId) return 'Elija un turno';
    const sel = this.seleccionados();
    if (sel.length === 0) return 'Seleccione al menos un trabajador';
    if (sel.length > AsignacionMasivaComponent.TOPE) return 'Máximo ' + AsignacionMasivaComponent.TOPE + ' trabajadores por operación';
    if (sel.some((x) => !x.area_id)) return 'Cada trabajador seleccionado necesita un área (puede usar "Aplicar a todos")';
    return null;
  }

  private cuerpo() {
    return {
      cliente_id: this.clienteId,
      turno_id: this.turnoId,
      fecha_desde: this.fechaDesde || null,
      actividad_id: this.modoActividad === 'existente' ? this.actividadId : null,
      actividad_nombre: this.modoActividad === 'nueva' ? this.actividadNombre.trim() : null,
      filas: this.seleccionados().map((x) => ({ trabajador_id: x.trabajador.id, area_id: Number(x.area_id) }))
    };
  }

  vistaPrevia() {
    if (this.faltante()) return;
    this.enviando = true;
    this.pev.vistaPrevia(this.cuerpo()).subscribe(
      (r) => { this.enviando = false; this.plan = r.data; },
      (e: HttpErrorResponse) => { this.enviando = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  confirmar() {
    if (!this.plan || this.plan.resumen.con_error > 0 || this.plan.resumen.a_crear === 0) return;
    this.enviando = true;
    this.pev.confirmar(this.cuerpo()).subscribe(
      (r) => {
        this.enviando = false;
        this.alertas.alertaExitoMsj('Asignación realizada', r.data.asignaciones_creadas.length + ' asignaciones creadas para "' + r.data.actividad.nombre + '".');
        this.plan = null;
        this.filas.forEach((x) => { x.seleccionado = false; x.area_id = null; });
        this.elegirCliente();
      },
      (e: HttpErrorResponse) => { this.enviando = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }
}
