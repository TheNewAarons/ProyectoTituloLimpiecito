import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
//MODELOS
import { Egreso } from '../../../model/egreso'
import { ResumenFacturas } from '../../../model/factura-pago';
//SERVICIOS
import { EgresoService } from '../../../services/egreso/egreso.service';
import { CajaService } from '../../../services/caja/caja.service';
import { LoginService } from '../../../services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-egreso',
  templateUrl: './egreso.component.html',
  styleUrls: ['./egreso.component.css']
})
export class EgresoComponent implements OnInit {

  public egreso:Egreso;
  public respuesta;
  public egresos;
  public usuario;
  public caja_activa;
  public page = 1;
  public pageSize = 12;

  //RF-FAC-01: estado de pago (facturas)
  public esAdmin = false;
  public resumenFacturas: ResumenFacturas;
  public hoy: string = EgresoComponent.hoySantiago();

  constructor(
    private egresoService:EgresoService,private cajaService:CajaService,
    private alertaService:AlertasService, private loginService: LoginService
  ) { }

  //RF-FAC-01: fecha de hoy en America/Santiago (no UTC, evita desincronizar "vencida" hasta 1 dia)
  private static hoySantiago(): string {
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const anio = partes.filter(p => p.type === 'year')[0].value;
    const mes = partes.filter(p => p.type === 'month')[0].value;
    const dia = partes.filter(p => p.type === 'day')[0].value;
    return anio + '-' + mes + '-' + dia;
  }

  ngOnInit() {
    //cambiar estito pe
    this.usuario = this.loginService.obtenerDatosUsuario();
    const nombreRol = this.usuario && this.usuario.role && this.usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
    this.obtenerCaja();
    this.egreso = new Egreso(1,'0',"",null,1,null,1,null,null,null,null,null,'PAGADA',null);
    this.obtenerEgresos();
    if (this.esAdmin) {
      this.obtenerResumenFacturas();
    }
  }

  //RESUMEN DE FACTURAS POR COBRAR/POR PAGAR (INFORMATIVO)
  obtenerResumenFacturas(): void {
    this.egresoService.obtenerResumenFacturas().subscribe(
      response => { this.resumenFacturas = response.data; },
      error => { console.log(error); }
    );
  }

  //SI EL TIPO DE DOCUMENTO ES FACTURA, EL ESTADO DE PAGO POR DEFECTO ES PENDIENTE
  cambioTipoDocumento(): void {
    this.egreso.estado_pago = this.egreso.tipo_documento === 'FACTURA' ? 'PENDIENTE' : 'PAGADA';
  }

  //UN EGRESO ESTA VENCIDO SI ESTA PENDIENTE Y SU FECHA DE VENCIMIENTO YA PASO
  estaVencido(egreso: Egreso): boolean {
    return egreso.estado_pago === 'PENDIENTE' && !!egreso.fecha_vencimiento && egreso.fecha_vencimiento < this.hoy;
  }

  //CLASE DEL BADGE SEGUN EL ESTADO DE PAGO
  claseBadgeEstadoPago(egreso: Egreso): string {
    if (egreso.estado_pago === 'PAGADA') { return 'badge badge-success'; }
    if (egreso.estado_pago === 'ANULADA') { return 'badge badge-danger'; }
    return this.estaVencido(egreso) ? 'badge badge-danger' : 'badge badge-warning';
  }

  //TEXTO DEL BADGE SEGUN EL ESTADO DE PAGO
  textoBadgeEstadoPago(egreso: Egreso): string {
    if (egreso.estado_pago === 'PAGADA') { return 'Pagada'; }
    if (egreso.estado_pago === 'ANULADA') { return 'Anulada'; }
    return this.estaVencido(egreso) ? 'Vencida' : 'Pendiente';
  }

  //MOSTRAR EL ERROR ENTREGADO POR EL BACKEND (spec §2.6)
  private mostrarErrorBackend(error): void {
    this.alertaService.cerrarAlerta();
    const mensaje = (error && error.error && error.error.error && error.error.error.message)
      ? error.error.error.message
      : 'Ha ocurrido un problema al procesar la solicitud.';
    this.alertaService.alertaErrorMsj(mensaje);
  }

  //MARCAR UN EGRESO (FACTURA) COMO PAGADO
  marcarComoPagado(egreso: Egreso): void {
    swal.fire({
      title: 'Marcar como pagado',
      html: '<label>Fecha de pago</label>' +
        '<input type="date" id="swal-fecha-pago-egreso" class="swal2-input" value="' + this.hoy + '">',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Marcar Pagado!',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const campo = document.getElementById('swal-fecha-pago-egreso') as HTMLInputElement;
        if (!campo || !campo.value) {
          swal.showValidationMessage('La fecha de pago es obligatoria');
          return false;
        }
        return campo.value;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.egresoService.marcarComoPagado(egreso.id, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Egreso marcado como pagado.');
            this.obtenerEgresos();
            this.obtenerResumenFacturas();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //ANULAR UN EGRESO (FACTURA): REEMPLAZA ELIMINAR, NUNCA SE BORRA EL REGISTRO
  anularEgreso(egreso: Egreso): void {
    swal.fire({
      title: 'Anular egreso',
      text: 'Ingresa el motivo de la anulación.',
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
      confirmButtonText: 'Si, Anular!',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => (!valor || valor.trim().length === 0) ? 'El motivo es obligatorio' : null
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.egresoService.anularEgreso(egreso.id, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Egreso anulado correctamente.');
            this.obtenerEgresos();
            this.obtenerResumenFacturas();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //REVERTIR EL PAGO DE UN EGRESO (SOLO ADMIN)
  revertirPagoEgreso(egreso: Egreso): void {
    swal.fire({
      title: 'Revertir pago',
      text: 'Ingresa el motivo de la reversión.',
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
      confirmButtonText: 'Si, Revertir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => (!valor || valor.trim().length === 0) ? 'El motivo es obligatorio' : null
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.egresoService.revertirPagoEgreso(egreso.id, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Pago revertido correctamente.');
            this.obtenerEgresos();
            this.obtenerResumenFacturas();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //OBTENER CAJA ACTIVA
  obtenerCaja(){
    this.cajaService.obtenerCajaActiva().subscribe(
      response => {
        this.respuesta = response;
        this.caja_activa = this.respuesta.caja;
      },
      error => {
        console.log(error)
      }
    )
  }
  //CREAR EGRESO
  crearEgreso(valid){
    this.egreso.monto = this.egreso.monto.replace(/,/g,'');
    if(valid){
      this.egreso.cajaId = this.caja_activa.id;
      this.egreso.fecha = formatDate(new Date(),'yyyy-MM-dd HH:mm:ss','en-US');
      this.egresoService.crearEgreso(this.egreso).subscribe(
        response => {
          this.obtenerEgresos();
          this.obtenerResumenFacturas();
          this.egreso = new Egreso(1,'0',"",null,1,null,1,5,null,null,null,null,'PAGADA',null);
          $("#createModal").modal('hide');
          this.alertaService.alertaExitoMsj('Egreso Creado Correctamente')
        }
      ),
      error => {
        console.log(error);
      }
    }
  }
  //OBTENER TODOS LOS EGRESOS
  obtenerEgresos(){
    this.egresoService.obtenerEgresos().subscribe(
      response => {
        this.respuesta = response;
        this.egresos = this.respuesta.egresos;
        this.egresos.forEach(element => {
          //console.log(element.monto);
        });
      },
      error => {
        console.log(error);
      }
    )
  }
  //ELIMINAR EGRESO
  eliminarEgreso(id: number): void {
    swal.fire({
      title: '¿Estas seguro?',
      text: "Vas a eliminar el Egreso agregado",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.egresoService.eliminarEgreso(id).subscribe(
          response =>{
            this.obtenerEgresos();
            this.alertaService.alertaExitoMsj('Egreso Eliminado Correctamente')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }
  //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  }

}
