import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
//MODELOS
import { Centro_costo } from '../../model/centro_costo';
//SERVICIOS
import { CentroCostoService } from '../../services/centro_costo/centro-costo.service';
import { ClienteService } from '../../services/cliente/cliente.service';
import { CajaService } from '../../services/caja/caja.service';
import { LoginService } from './../../services/login/login.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

declare const $: any;

@Component({
  selector: 'app-centro-costo',
  templateUrl: './centro-costo.component.html',
  styleUrls: ['./centro-costo.component.css']
})
export class CentroCostoComponent implements OnInit {
  public clientes = [];
  public centro: Centro_costo;
  public caja_activa: any;
  public centroEdit: Centro_costo;
  public centrosActivos;
  public centrosInactivos;
  public searchActivo;
  public searchInactivo;
  public usuario;
  public esAdmin = false;
  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  constructor(
    private centroCostoService: CentroCostoService,private clienteService: ClienteService,
    private cajaService: CajaService,private loginService: LoginService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.centro = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
    this.centroEdit = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
    this.obtenerCajaActiva();
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    // reabrir un CC: solo Administrador (el backend también lo exige)
    const nombreRol = this.usuario && this.usuario.role && this.usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
  }
  //OBTENER CAJA ACTIVA
  obtenerCajaActiva() {
    this.alertaService.loading()
    this.cajaService.obtenerCajaActiva().subscribe(
      (response: any) => {
        this.caja_activa = response.caja;
        if (this.caja_activa != null) {
          this.obtenerDatos()
        } else {
          this.alertaService.cerrarAlerta()
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  // mensajeExito se muestra al terminar la recarga: cerrarAlerta() cerraría el aviso apenas aparece
  obtenerDatos(mensajeExito?: string): void {
    let centro_activo_service = this.centroCostoService.obtenerActivos(this.caja_activa.id)
    let centro_inactivo_service = this.centroCostoService.obtenerInactivos(this.caja_activa.id)
    let cliente_service = this.clienteService.obtenerClientesActivos()
    forkJoin([centro_activo_service,centro_inactivo_service,cliente_service]).subscribe(
      (response:any)=>{
        if (mensajeExito) {
          this.alertaService.alertaExitoMsj(mensajeExito)
        } else {
          this.alertaService.cerrarAlerta()
        }
        this.centrosActivos = response[0].centros
        this.centrosInactivos = response[1].centros
        this.clientes = response[2].clientes
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }

  //CREAR CENTRO DE COSTOS
  crearCentro(valid) {
    if (valid) {
      this.alertaService.loading()
      this.centro.precio_servicio = this.centro.precio_servicio.replace(/,/g, '');
      this.centro.fecha_inicio = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
      this.centro.cajaId = this.caja_activa.id;
      this.centroCostoService.crearCentro(this.centro).subscribe(
        (response: any) => {
          this.centro = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
          this.obtenerDatos();
          $('#createModal').modal('hide');
          this.alertaService.showNotification('Centro de Costo Creado Correctamente')
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //OBTENER VALOR FACTURA  CLIENTE PARA EL PRECIO SERVICIO DEL MODAL PARA CREAR EL CENTRO
  obtenerValorCliente(idCliente) {
    this.clientes.forEach((element) => {
      if (element.id == idCliente) {
        this.centro.precio_servicio = element.valor_factura;
      }
    });
  }
  //LIMPIAR MODAL
  limpiar() {
    this.centro = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
  }
  //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  };

  //BUSQUEDA EN CENTROS ACTIVOS
  buscarActivo() {
    this.alertaService.loading()
    this.centroCostoService.obtenerBuscaActivos(this.caja_activa.id, this.searchActivo).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.centrosActivos = response.centros;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //REABRIR CENTRO DE COSTO CERRADO POR ERROR: MOTIVO -> CODIGO AL CORREO DEL USUARIO -> CONFIRMAR CON EL CODIGO
  //(EL BACKEND RECHAZA SI LA CAJA DE SU MES ESTA CERRADA)
  reabrirCentro(centro: Centro_costo): void {
    swal.fire({
      title: 'Reabrir centro de costo N° ' + centro.numero_cc,
      text: 'Ingresa el motivo de la reapertura.',
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-warning',
        cancelButton: 'btn btn-default'
      },
      confirmButtonText: 'Si, Reabrir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => {
        const longitud = valor ? valor.trim().length : 0;
        return longitud < 5 || longitud > 500 ? 'El motivo debe tener entre 5 y 500 caracteres' : null;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.centroCostoService.pedirCodigoReapertura(centro.id, result.value).subscribe(
          (respuesta: { data: { correo: string } }) => {
            this.alertaService.cerrarAlerta();
            this.confirmarConCodigo(centro, respuesta.data.correo);
          },
          (error: HttpErrorResponse) => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaErrorMsj('No se pudo reabrir el Centro de Costo', this.mensajeError(error));
          }
        );
      }
    });
  }
  //PIDE EL CODIGO ENVIADO AL CORREO; SI ES INCORRECTO MUESTRA EL ERROR SIN CERRAR EL DIALOGO
  private confirmarConCodigo(centro: Centro_costo, correo: string): void {
    swal.fire({
      title: 'Código de confirmación',
      text: 'Enviamos un código de 6 dígitos a ' + correo + '. Vence en 10 minutos.',
      input: 'text',
      inputPlaceholder: '000000',
      inputAttributes: { maxlength: '6', inputmode: 'numeric', autocomplete: 'one-time-code' },
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-warning',
        cancelButton: 'btn btn-default'
      },
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !swal.isLoading(),
      inputValidator: (valor: string) => /^\d{6}$/.test((valor || '').trim()) ? null : 'Ingresa los 6 dígitos del código',
      preConfirm: (valor: string) =>
        this.centroCostoService.reabrirCentro(centro.id, valor.trim()).toPromise().catch((error: HttpErrorResponse) => {
          swal.showValidationMessage(this.mensajeError(error));
        })
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.obtenerDatos('Centro de Costo Reabierto Correctamente!');
      }
    });
  }
  private mensajeError(error: HttpErrorResponse): string {
    const mensaje = error && error.error && error.error.error && error.error.error.message;
    return mensaje || 'Ha ocurrido un problema al procesar la solicitud.';
  }
  //BUSQUEDA EN CENTROS INACTIVOS
  buscarInactivo() {
    this.alertaService.loading()
    this.centroCostoService.obtenerBuscaInactivos(this.caja_activa.id, this.searchInactivo).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.centrosInactivos = response.centros;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
}
