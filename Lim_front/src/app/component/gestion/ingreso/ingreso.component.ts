import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';
//MODELOS
import { IngresoFactura, ResumenFacturas } from '../../../model/factura-pago';
//SERVICIOS
import { EgresoService } from '../../../services/egreso/egreso.service';
import { LoginService } from '../../../services/login/login.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { anularConCodigo } from '../anular-con-codigo';

// RF-FAC-01: ingresos de centros de costo (cc_ingresos) con su estado de pago. Mismo patrón que Egresos.
@Component({
  selector: 'app-ingreso',
  templateUrl: './ingreso.component.html'
})
export class IngresoComponent implements OnInit {
  public ingresos: IngresoFactura[] = [];
  public ingresosFiltrados: IngresoFactura[] = [];
  public resumenFacturas: ResumenFacturas;
  public busqueda = '';
  public filtroEstado = '';
  public page = 1;
  public pageSize = 12;
  public esAdmin = false;
  public hoy: string = IngresoComponent.hoySantiago();

  constructor(private egresoService: EgresoService, private loginService: LoginService, private alertaService: AlertasService) { }

  //FECHA DE HOY EN America/Santiago (no UTC, evita desfasar "vencida" un día)
  private static hoySantiago(): string {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const valor = (tipo: string): string => partes.filter(p => p.type === tipo)[0].value;
    return valor('year') + '-' + valor('month') + '-' + valor('day');
  }

  ngOnInit(): void {
    const usuario = this.loginService.obtenerDatosUsuario();
    const nombreRol = usuario && usuario.role && usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
    this.obtenerIngresos();
    this.obtenerResumenFacturas();
  }

  obtenerIngresos(): void {
    this.egresoService.obtenerIngresos().subscribe(
      r => { this.ingresos = r.data; this.filtrarIngresos(); },
      (error: HttpErrorResponse) => this.mostrarErrorBackend(error)
    );
  }

  obtenerResumenFacturas(): void {
    this.egresoService.obtenerResumenFacturas().subscribe(r => { this.resumenFacturas = r.data; }, () => { this.resumenFacturas = null; });
  }

  //PENDIENTE CON FECHA DE VENCIMIENTO YA PASADA
  estaVencido(ingreso: IngresoFactura): boolean {
    return ingreso.estado_pago === 'PENDIENTE' && !!ingreso.fecha_vencimiento && ingreso.fecha_vencimiento < this.hoy;
  }

  claseBadgeEstadoPago(ingreso: IngresoFactura): string {
    if (ingreso.estado_pago === 'PAGADA') { return 'badge badge-success'; }
    if (ingreso.estado_pago === 'ANULADA') { return 'badge badge-danger'; }
    return this.estaVencido(ingreso) ? 'badge badge-danger' : 'badge badge-warning';
  }

  textoBadgeEstadoPago(ingreso: IngresoFactura): string {
    if (ingreso.estado_pago === 'PAGADA') { return 'Pagada'; }
    if (ingreso.estado_pago === 'ANULADA') { return 'Anulada'; }
    return this.estaVencido(ingreso) ? 'Vencida' : 'Pendiente';
  }

  //FILTRAR POR TEXTO (CENTRO, DESCRIPCIÓN, DOCUMENTO) Y POR ESTADO (TEXTO DEL BADGE)
  filtrarIngresos(): void {
    const texto = this.busqueda.trim().toLowerCase();
    this.ingresosFiltrados = this.ingresos.filter((i: IngresoFactura): boolean => {
      if (this.filtroEstado && this.textoBadgeEstadoPago(i) !== this.filtroEstado) { return false; }
      if (!texto) { return true; }
      return [i.numero_cc, i.comentario, i.tipo_documento, i.numero_documento].some(c => !!c && String(c).toLowerCase().indexOf(texto) !== -1);
    });
    this.page = 1;
  }

  marcarComoPagado(ingreso: IngresoFactura): void {
    swal.fire({
      title: 'Marcar como pagado',
      html: '<label>Fecha de pago</label>' +
        '<input type="date" id="swal-fecha-pago-ingreso" class="swal2-input" value="' + this.hoy + '">',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Marcar Pagado!',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const campo = document.getElementById('swal-fecha-pago-ingreso') as HTMLInputElement;
        if (!campo || !campo.value) {
          swal.showValidationMessage('La fecha de pago es obligatoria');
          return false;
        }
        return campo.value;
      }
    }).then(result => {
      if (result.value) { this.cambiarEstado(ingreso, 'pagar', { fecha_pago: result.value }, 'Ingreso marcado como pagado.'); }
    });
  }

  // AUT-029 (RNF-SEC-02): anular es irreversible -> motivo y código por correo.
  anularIngreso(ingreso: IngresoFactura): void {
    anularConCodigo({
      tipo: 'ingresos', id: ingreso.id, titulo: 'Anular ingreso',
      advertencia: 'La anulación no se puede deshacer.',
      exito: 'Ingreso anulado correctamente.',
      servicio: this.egresoService, alertas: this.alertaService,
      alTerminar: () => { this.obtenerIngresos(); this.obtenerResumenFacturas(); }
    });
  }

  revertirPagoIngreso(ingreso: IngresoFactura): void {
    this.pedirMotivo('Revertir pago', 'Ingresa el motivo de la reversión.', 'Si, Revertir!').then(motivo => {
      if (motivo) { this.cambiarEstado(ingreso, 'revertir', { motivo }, 'Pago revertido correctamente.'); }
    });
  }

  private pedirMotivo(titulo: string, texto: string, confirmar: string): Promise<string | undefined> {
    return swal.fire({
      title: titulo,
      text: texto,
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
      confirmButtonText: confirmar,
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => (!valor || valor.trim().length === 0) ? 'El motivo es obligatorio' : null
    }).then(result => result.value);
  }

  private cambiarEstado(ingreso: IngresoFactura, accion: 'pagar' | 'anular' | 'revertir', body: { fecha_pago?: string, motivo?: string }, exito: string): void {
    this.alertaService.loading();
    this.egresoService.cambiarEstadoIngreso(ingreso.id, accion, body).subscribe(
      () => {
        this.alertaService.cerrarAlerta();
        this.alertaService.alertaExitoMsj(exito);
        this.obtenerIngresos();
        this.obtenerResumenFacturas();
      },
      (error: HttpErrorResponse) => this.mostrarErrorBackend(error)
    );
  }

  //MOSTRAR EL ERROR ENTREGADO POR EL BACKEND (spec §2.6)
  private mostrarErrorBackend(error: HttpErrorResponse): void {
    this.alertaService.cerrarAlerta();
    const mensaje = (error && error.error && error.error.error && error.error.error.message)
      ? error.error.error.message
      : 'Ha ocurrido un problema al procesar la solicitud.';
    this.alertaService.alertaErrorMsj(mensaje);
  }
}
