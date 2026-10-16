import { Component, OnInit } from '@angular/core';
import swal from 'sweetalert2';

//SERVICIOS
import { LiquidacionService } from '../../../services/liquidacion/liquidacion.service';
import { LoginService } from '../../../services/login/login.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

//MODELOS
import { EstadoPagoLiquidacion } from '../../../model/liquidacion-pago';

@Component({
  selector: 'app-liquidacion',
  templateUrl: './liquidacion.component.html',
  styleUrls: ['./liquidacion.component.css']
})
export class LiquidacionComponent implements OnInit {

  public respuesta;
  public centroTrabajadores;
  public searchActivo;
  public page = 1;
  public pageSize = 12;

  //ESTADO DE PAGO (RF-CAJA-02)
  public esAdmin = false;
  public seleccionadas: number[] = [];
  public filtroEstadoPago: 'TODAS' | EstadoPagoLiquidacion = 'TODAS';
  public centroTrabajadoresFiltrados = [];

  constructor(
    private liquidacionService: LiquidacionService,
    private loginService: LoginService,
    private alertaService: AlertasService
  ) { }

  public usuario;

  ngOnInit(): void {
    this.usuario = this.loginService.obtenerDatosUsuario();
    //NOTA: el rol Admin aparece como 'ADMINISTRADOR' en otros guards del front (p.ej.
    //app_guard.service.ts) pero como 'Administrador' en la BD local (ver services/constantes.js
    //del backend). Se compara sin distinguir mayúsculas para no ocultar la acción al Admin real.
    const nombreRol = this.usuario && this.usuario.role && this.usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
    this.obtenerLiquidaciones();
  }

  //OBTENER LIQUIDACIONES
  obtenerLiquidaciones(): void {
    this.liquidacionService.obtenerLiquidaciones().subscribe(
      response => {
        this.respuesta = response;
        this.centroTrabajadores = this.respuesta.centroTrabajadores;
        this.seleccionadas = [];
        this.aplicarFiltroEstado();
      },
      error => {
        console.log(error);
      }
    );
  }

  //FILTRA LA LISTA POR ESTADO DE PAGO (RF-CAJA-02)
  aplicarFiltroEstado(): void {
    const lista = this.centroTrabajadores || [];
    this.centroTrabajadoresFiltrados = this.filtroEstadoPago === 'TODAS'
      ? lista
      : lista.filter(centroTrabajador => this.estadoPago(centroTrabajador) === this.filtroEstadoPago);
  }

  //AL CAMBIAR EL FILTRO SE VUELVE A LA PAGINA 1 Y SE LIMPIA LA SELECCION PARA NO PAGAR FILAS OCULTAS
  cambiarFiltroEstado(): void {
    this.page = 1;
    this.seleccionadas = [];
    this.aplicarFiltroEstado();
  }

  //BUSCADOR
  buscar(): void {
    this.liquidacionService.obtenerBusqueda(this.searchActivo).subscribe(
      response => {
        this.respuesta = response;
        this.centroTrabajadores = this.respuesta.centroTrabajadores;
        this.seleccionadas = [];
        this.aplicarFiltroEstado();
      },
      error => {
        console.log(error);
      }
    );
  }

  //OBTIENE EL ESTADO DE PAGO DE LA LIQUIDACION, POR DEFECTO EN ESPERA
  estadoPago(centroTrabajador): EstadoPagoLiquidacion {
    return (centroTrabajador && centroTrabajador.liquidacione && centroTrabajador.liquidacione.estado_pago) || 'EN_ESPERA';
  }

  //CLASE DEL BADGE SEGUN EL ESTADO DE PAGO
  claseBadgeEstadoPago(centroTrabajador): string {
    const estado = this.estadoPago(centroTrabajador);
    if (estado === 'PAGADA') {
      return 'badge badge-success';
    } else if (estado === 'ANULADA') {
      return 'badge badge-danger';
    }
    return 'badge badge-warning';
  }

  //TEXTO DEL BADGE SEGUN EL ESTADO DE PAGO
  textoBadgeEstadoPago(centroTrabajador): string {
    const estado = this.estadoPago(centroTrabajador);
    if (estado === 'PAGADA') {
      return '✅ Pagada';
    } else if (estado === 'ANULADA') {
      return 'Anulada';
    }
    return '🕐 En espera';
  }

  //SOLO LAS LIQUIDACIONES EN_ESPERA SON SELECCIONABLES
  esSeleccionable(centroTrabajador): boolean {
    return this.estadoPago(centroTrabajador) === 'EN_ESPERA';
  }

  //COMPROBAR SI UNA LIQUIDACION ESTA SELECCIONADA
  estaSeleccionada(idLiquidacion: number): boolean {
    return this.seleccionadas.indexOf(idLiquidacion) !== -1;
  }

  //AGREGAR O QUITAR UNA LIQUIDACION DE LA SELECCION
  toggleSeleccion(idLiquidacion: number): void {
    const posicion = this.seleccionadas.indexOf(idLiquidacion);
    if (posicion === -1) {
      this.seleccionadas.push(idLiquidacion);
    } else {
      this.seleccionadas.splice(posicion, 1);
    }
  }

  //MONTO TOTAL DE LAS LIQUIDACIONES SELECCIONADAS
  montoSeleccionadas(): number {
    let total = 0;
    this.centroTrabajadores.forEach(centroTrabajador => {
      if (this.estaSeleccionada(centroTrabajador.liquidacioneId)) {
        total += centroTrabajador.liquidacione.liquido_pagar;
      }
    });
    return total;
  }

  //MOSTRAR EL ERROR ENTREGADO POR EL BACKEND (spec §2.6)
  private mostrarErrorBackend(error): void {
    this.alertaService.cerrarAlerta();
    const mensaje = (error && error.error && error.error.error && error.error.error.message)
      ? error.error.error.message
      : 'Ha ocurrido un problema al procesar la solicitud.';
    this.alertaService.alertaErrorMsj(mensaje);
  }

  //MARCAR UNA LIQUIDACION COMO PAGADA
  marcarComoPagada(centroTrabajador): void {
    const hoy = new Date().toISOString().substring(0, 10);
    swal.fire({
      title: 'Marcar como pagada',
      html: '<label>Fecha de pago</label>' +
        '<input type="date" id="swal-fecha-pago" class="swal2-input" value="' + hoy + '">',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      confirmButtonText: 'Si, Marcar Pagada!',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const campo = document.getElementById('swal-fecha-pago') as HTMLInputElement;
        if (!campo || !campo.value) {
          swal.showValidationMessage('La fecha de pago es obligatoria');
          return false;
        }
        return campo.value;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.liquidacionService.marcarComoPagada(centroTrabajador.liquidacioneId, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Liquidación marcada como pagada.');
            this.obtenerLiquidaciones();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //PAGAR LIQUIDACIONES SELECCIONADAS EN LOTE
  pagarSeleccionadas(): void {
    if (this.seleccionadas.length === 0) {
      return;
    }
    const hoy = new Date().toISOString().substring(0, 10);
    const cantidad = this.seleccionadas.length;
    const monto = this.montoSeleccionadas();
    swal.fire({
      title: '¿Pagar liquidaciones seleccionadas?',
      html: 'Se marcarán como pagadas <b>' + cantidad + '</b> liquidaciones por un total de <b>' +
        monto.toLocaleString('es-CL') + '</b>.<br/><br/>' +
        '<label>Fecha de pago</label>' +
        '<input type="date" id="swal-fecha-pago-lote" class="swal2-input" value="' + hoy + '">',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      confirmButtonText: 'Si, Pagar!',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const campo = document.getElementById('swal-fecha-pago-lote') as HTMLInputElement;
        if (!campo || !campo.value) {
          swal.showValidationMessage('La fecha de pago es obligatoria');
          return false;
        }
        return campo.value;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.liquidacionService.pagarLote(this.seleccionadas, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Liquidaciones pagadas correctamente.');
            this.obtenerLiquidaciones();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //REVERTIR EL PAGO DE UNA LIQUIDACION (SOLO ADMIN)
  revertirPago(centroTrabajador): void {
    swal.fire({
      title: 'Revertir pago',
      text: 'Ingresa el motivo de la reversión.',
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-default'
      },
      confirmButtonText: 'Si, Revertir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => {
        if (!valor || valor.trim().length === 0) {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.liquidacionService.revertirPago(centroTrabajador.liquidacioneId, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Pago revertido correctamente.');
            this.obtenerLiquidaciones();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }
}
