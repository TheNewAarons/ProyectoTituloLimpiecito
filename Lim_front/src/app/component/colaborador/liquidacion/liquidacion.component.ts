import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { Platform } from '@angular/cdk/platform';
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
  styleUrls: ['./liquidacion.component.css'],
  // Calendario de los filtros en español (dd-mm-aaaa) solo en esta pantalla: el adaptador se crea aquí para que
  // tome este locale (el de MatNativeDateModule se crea a nivel de módulo con el locale por defecto).
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: DateAdapter, useClass: NativeDateAdapter, deps: [MAT_DATE_LOCALE, Platform] }
  ]
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

  // Revisión de requerimientos (AUT-022): filtros por fecha de la liquidación, cliente y N° de centro de costo.
  public filtroDesde: Date = null; // del calendario (mat-datepicker)
  public filtroHasta: Date = null;
  public filtroCliente = 'TODOS';
  public filtroCc = '';

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

  //FILTRA LA LISTA POR ESTADO DE PAGO (RF-CAJA-02), FECHA, CLIENTE Y N° DE CENTRO DE COSTO (AUT-022)
  //La llaman la carga, el buscador y la recarga tras pagar: así los filtros se mantienen.
  aplicarFiltroEstado(): void {
    const lista = this.centroTrabajadores || [];
    const cc = String(this.filtroCc || '').trim();
    const desde = this.aYmd(this.filtroDesde);
    const hasta = this.aYmd(this.filtroHasta);
    this.centroTrabajadoresFiltrados = lista.filter(centroTrabajador => {
      if (this.filtroEstadoPago !== 'TODAS' && this.estadoPago(centroTrabajador) !== this.filtroEstadoPago) { return false; }
      const fecha = this.fechaLiquidacion(centroTrabajador);
      if (desde && (!fecha || fecha < desde)) { return false; }
      if (hasta && (!fecha || fecha > hasta)) { return false; }
      if (this.filtroCliente !== 'TODOS' && this.clienteDe(centroTrabajador) !== this.filtroCliente) { return false; }
      if (cc && String(centroTrabajador.centro_costo ? centroTrabajador.centro_costo.numero_cc : '') !== cc) { return false; }
      return true;
    });
    // Retroalimentación: la más nueva primero (la recién creada tiene el id más alto, aunque su fecha sea de otro mes).
    this.centroTrabajadoresFiltrados.sort((a, b) => Number(b.liquidacioneId || 0) - Number(a.liquidacioneId || 0));
  }

  //FECHA DE LA LIQUIDACION EN HORA DE CHILE (yyyy-MM-dd), PARA COMPARAR CON LOS CAMPOS DESDE/HASTA
  fechaLiquidacion(centroTrabajador): string {
    const f = centroTrabajador && centroTrabajador.liquidacione ? centroTrabajador.liquidacione.fecha_creacion : null;
    return f ? new Date(f).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }) : '';
  }

  clienteDe(centroTrabajador): string {
    const c = centroTrabajador && centroTrabajador.centro_costo && centroTrabajador.centro_costo.cliente;
    return c && c.representante ? c.representante : '';
  }

  //CLIENTES QUE APARECEN EN LA LISTA, PARA EL SELECTOR
  clientesDisponibles(): string[] {
    const nombres = (this.centroTrabajadores || []).map(ct => this.clienteDe(ct)).filter(n => !!n);
    return nombres.filter((n, i) => nombres.indexOf(n) === i).sort();
  }

  //FECHA DEL CALENDARIO (DIA LOCAL ELEGIDO) -> yyyy-MM-dd; null -> ''
  aYmd(d: Date): string {
    if (!d) { return ''; }
    const dos = (n: number) => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }

  hayFiltros(): boolean {
    return this.filtroEstadoPago !== 'TODAS' || !!this.filtroDesde || !!this.filtroHasta || this.filtroCliente !== 'TODOS' || !!String(this.filtroCc || '').trim();
  }

  limpiarFiltros(): void {
    this.filtroEstadoPago = 'TODAS';
    this.filtroDesde = null;
    this.filtroHasta = null;
    this.filtroCliente = 'TODOS';
    this.filtroCc = '';
    this.cambiarFiltroEstado();
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

  //SOLO LAS LIQUIDACIONES CERRADAS (estado 0) Y EN_ESPERA SON SELECCIONABLES (el backend rechaza las abiertas)
  esSeleccionable(centroTrabajador): boolean {
    return this.estadoPago(centroTrabajador) === 'EN_ESPERA' && !!centroTrabajador.liquidacione && centroTrabajador.liquidacione.estado == 0;
  }

  //COMPROBAR SI UNA LIQUIDACION ESTA SELECCIONADA
  estaSeleccionada(idLiquidacion: number): boolean {
    return this.seleccionadas.indexOf(idLiquidacion) !== -1;
  }

  //SELECCIONAR TODAS: las que se pueden pagar entre las que muestran los filtros (todas las páginas)
  seleccionablesVisibles(): number[] {
    return (this.centroTrabajadoresFiltrados || []).filter(ct => this.esSeleccionable(ct)).map(ct => ct.liquidacioneId);
  }

  todasSeleccionadas(): boolean {
    const ids = this.seleccionablesVisibles();
    return ids.length > 0 && ids.every(id => this.estaSeleccionada(id));
  }

  algunaSeleccionada(): boolean {
    return this.seleccionadas.length > 0 && !this.todasSeleccionadas();
  }

  alternarTodas(marcar: boolean): void {
    this.seleccionadas = marcar ? this.seleccionablesVisibles() : [];
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
    const hoy = formatDate(new Date(), 'yyyy-MM-dd', 'en-US'); // hora local, no UTC
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
    const hoy = formatDate(new Date(), 'yyyy-MM-dd', 'en-US'); // hora local, no UTC
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
