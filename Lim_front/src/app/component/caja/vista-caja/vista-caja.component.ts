import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as html2pdf from 'html2pdf.js';
import swal from 'sweetalert2';

//SERVICIOS
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';
import { CajaService } from '../../../services/caja/caja.service';
import { EgresoService } from '../../../services/egreso/egreso.service';
import { LiquidacionService } from '../../../services/liquidacion/liquidacion.service';
import { LoginService } from '../../../services/login/login.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';

//MODELOS
import { ResumenPendientesPago } from '../../../model/liquidacion-pago';
import { CajaResumen } from '../../../model/caja-resumen';

export class detalleLiquidacion {
  constructor(
    public trabajador: string,
    public numero_cc: number,
    public cliente: string,
    public liquido_pagar: number,
    public egreso_id: number = null
  ) {}
}
export class detalleInsumo {
  constructor(public producto: string, public cantidad: number, public total: number) {}
}
export class detalleEgreso {
  constructor(public numero_cc: number, public centro: string, public monto: number) {}
}

//SESION MINIMA LEIDA DE LoginService (el modelo Usuario no declara `role`, que sí viene en el JWT decodificado)
export interface UsuarioSesion {
  id: number;
  role?: {
    nombre: string;
  };
}
@Component({
  selector: 'app-vista-caja',
  templateUrl: './vista-caja.component.html',
  styleUrls: ['./vista-caja.component.css']
})
export class VistaCajaComponent implements OnInit {
  public idCaja;
  public centros;
  public caja;
  public productos;
  public total;
  public generalEgresos;

  //VARIABLES INDICADORES
  public egresoGeneral = 0;
  public total_ingresoMoment = 0;
  public total_egresoMoment = 0;
  public utilidadMoment = 0;

  //RESUMEN DE LIQUIDACIONES PENDIENTES DE PAGO (RF-CAJA-02)
  public resumenPendientesPago: ResumenPendientesPago = { cantidad: 0, monto_total: 0 };

  //RESUMEN DE SALDO ENCADENADO POR PERIODO (RF-CAJA-01)
  public resumenPeriodo: CajaResumen = null;
  public periodo: string = null;
  public esAdmin = false;
  public usuario: UsuarioSesion | false;

  //TABLAS PARA DESPLEGAR
  public tablaLiquidaciones = [];
  public detalleLiquidacion: detalleLiquidacion;
  public tablaInsumos = [];
  public detalleInsumo: detalleInsumo;
  public tablaEgresos = [];
  public detalleEgreso: detalleEgreso;

  constructor(
    private centroCostoService: CentroCostoService, private _route: ActivatedRoute,
    private cajaService: CajaService, private egresoService: EgresoService,
    private liquidacionService: LiquidacionService, private loginService: LoginService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.detalleLiquidacion = new detalleLiquidacion('', null, '', 0, null);
    this.detalleInsumo = new detalleInsumo('', 0, 0);
    this.detalleEgreso = new detalleEgreso(null, '', 0);
    this.idCaja = this._route.snapshot.paramMap.get('id');
    this.usuario = this.loginService.obtenerDatosUsuario();
    //NOTA: mismo criterio que liquidacion.component.ts: el rol Admin aparece como
    //'ADMINISTRADOR' en app_guard.service.ts y como 'Administrador' en services/constantes.js
    //del backend; se compara sin distinguir mayúsculas.
    const nombreRol = this.usuario && this.usuario.role && this.usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
    this.ObtenerDatos()
  }
  //OBTENER CAJA ACTIVA, EGRESOS GENERAL Y CENTRO DE COSTOS
  ObtenerDatos(){
    this.alertaService.loading()
    let caja_service = this.cajaService.obtenerCajaId(this.idCaja)
    let egreso_service = this.egresoService.obtenerEgresosCaja(this.idCaja)
    let centro_service = this.centroCostoService.obtenerCentroCaja(this.idCaja)
    forkJoin([caja_service,egreso_service, centro_service]).subscribe(
      (response:any)=>{
        this.caja = response[0].caja
        this.generalEgresos = response[1].egresos
        if (this.generalEgresos.length != 0) {
          this.generalEgresos.forEach((e) => {
            this.egresoGeneral += e.monto;
          });
        }
        this.centros = response[2].centros
        this.periodo = this.caja && this.caja.fecha_inicio ? String(this.caja.fecha_inicio).substring(0, 7) : null;
        this.calcularDatos();
        this.obtenerResumenPendientesPago();
        this.obtenerResumenPeriodo();
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }
  //OBTENER RESUMEN DE LIQUIDACIONES PENDIENTES DE PAGO DEL PERIODO DE LA CAJA
  obtenerResumenPendientesPago(): void {
    this.liquidacionService.obtenerResumenPendientesPago(this.periodo).subscribe(
      (response) => {
        this.resumenPendientesPago = response.data;
      },
      () => {
        this.resumenPendientesPago = { cantidad: 0, monto_total: 0 };
      }
    );
  }

  //OBTENER EL RESUMEN DE SALDO ENCADENADO (SALDO MES ANTERIOR / INGRESOS / EGRESOS / SALDO ACTUAL)
  obtenerResumenPeriodo(): void {
    if (!this.periodo) {
      this.resumenPeriodo = null;
      return;
    }
    this.cajaService.obtenerResumenPeriodo(this.periodo).subscribe(
      (response) => {
        this.resumenPeriodo = response.data;
      },
      () => {
        this.resumenPeriodo = null;
      }
    );
  }

  //TEXTO DEL TOOLTIP CUANDO EL SALDO ES PROVISIONAL (RF-CAJA-01, saldo no congelado)
  tooltipSaldoProvisional(): string {
    return 'El saldo inicial se recalcula en vivo porque un mes anterior sigue abierto o reabierto; ' +
      'no está congelado hasta que ese mes se cierre.';
  }

  //CERRAR EL MES ACTUAL (SOLO ADMIN)
  cerrarMes(): void {
    if (!this.esAdmin || !this.periodo) {
      return;
    }
    swal.fire({
      title: '¿Cerrar mes ' + this.periodo + '?',
      text: 'Se congelará el saldo del periodo y se abrirá/actualizará el mes siguiente.',
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      confirmButtonText: 'Si, Cerrar mes!',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.cajaService.cerrarMes(this.periodo).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Mes cerrado correctamente.');
            this.obtenerResumenPeriodo();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //REABRIR EL MES ACTUAL CON MOTIVO OBLIGATORIO (SOLO ADMIN, SOLO SI ESTA CERRADA)
  reabrirMes(): void {
    if (!this.esAdmin || !this.periodo) {
      return;
    }
    swal.fire({
      title: 'Reabrir mes ' + this.periodo,
      text: 'Ingresa el motivo de la reapertura.',
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
      confirmButtonText: 'Si, Reabrir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor: string) => {
        const longitud = valor ? valor.trim().length : 0;
        if (longitud < 5 || longitud > 500) {
          return 'El motivo debe tener entre 5 y 500 caracteres';
        }
        return null;
      }
    }).then(result => {
      if (result.value) {
        this.alertaService.loading();
        this.cajaService.reabrirMes(this.periodo, result.value).subscribe(
          () => {
            this.alertaService.cerrarAlerta();
            this.alertaService.alertaExitoMsj('Mes reabierto correctamente.');
            this.obtenerResumenPeriodo();
          },
          error => this.mostrarErrorBackend(error)
        );
      }
    });
  }

  //MOSTRAR MENSAJE DE ERROR DEVUELTO POR EL BACKEND ({ ok:false, error:{ message } })
  private mostrarErrorBackend(error: HttpErrorResponse): void {
    this.alertaService.cerrarAlerta();
    const mensaje = (error && error.error && error.error.error && error.error.error.message)
      ? error.error.error.message
      : 'Ha ocurrido un problema al procesar la solicitud.';
    this.alertaService.alertaErrorMsj(mensaje);
  }
  //CALCULAR DATOS
  calcularDatos() {
    if (this.centros.length != 0) {
      //recorriendo los centros
      let servicios = 0;
      this.centros.forEach((e) => {
        servicios += e.precio_servicio;
        let t_egreso = 0;
        //verificar si extiste egresos y recorrer
        if (e.cc_egresos.length != 0) {
          e.cc_egresos.forEach((egreso) => {
            t_egreso += egreso.monto;
          });
          this.detalleEgreso.monto = t_egreso;
          this.detalleEgreso.centro = e.cliente.representante;
          this.detalleEgreso.numero_cc = e.numero_cc;
          this.tablaEgresos.push(this.detalleEgreso);
          this.detalleEgreso = new detalleEgreso(null, '', 0);
        }
        //recorrer centro de costo trabajadores, para crear y obtener liquidaciones
        if (e.centro_costo_trabajadores.length != 0) {
          e.centro_costo_trabajadores.forEach((centro_costo) => {
            if (centro_costo.liquidacione) {
              this.detalleLiquidacion.numero_cc = e.numero_cc;
              this.detalleLiquidacion.liquido_pagar = centro_costo.liquidacione.liquido_pagar;
              this.detalleLiquidacion.cliente = e.cliente.representante;
              this.detalleLiquidacion.trabajador = centro_costo.trabajadore.nombre + ' ' + centro_costo.trabajadore.apellido;
              //RF-CAJA-02: si ya tiene egreso_id, el pago ya está contado en egresoGeneral (evita doble conteo N1/A6)
              this.detalleLiquidacion.egreso_id = centro_costo.liquidacione.egreso_id || null;
              this.tablaLiquidaciones.push(this.detalleLiquidacion);
              this.detalleLiquidacion = new detalleLiquidacion('', null, '', 0, null);
            }
          });
        }
        //recorrer lista de insumo
        if (e.lista_insumos.length != 0) {
          e.lista_insumos.forEach((lista) => {
            if (lista.estado == 1) {
              lista.linea_insumos.forEach((linea) => {
                this.detalleInsumo.producto = linea.producto.nombre;
                this.detalleInsumo.cantidad = linea.cantidad;
                this.detalleInsumo.total = linea.total_linea;
                if (this.tablaInsumos.length == 0) {
                  this.tablaInsumos.push(this.detalleInsumo);
                  this.detalleInsumo = new detalleInsumo('', 0, 0);
                } else {
                  let index = this.tablaInsumos.findIndex((tabla) => tabla.producto === linea.producto.nombre);
                  if (index == -1) {
                    this.tablaInsumos.push(this.detalleInsumo);
                    this.detalleInsumo = new detalleInsumo('', 0, 0);
                  } else {
                    this.tablaInsumos[index].cantidad += linea.cantidad;
                    this.tablaInsumos[index].total += linea.total_linea;
                    this.detalleInsumo = new detalleInsumo('', 0, 0);
                  }
                }
              });
            }
          });
        }
      }); //TERMINA PRIMER FOR DE LOS CENTROS
      //REALIZAR SUMATORIA DE DATOS FICTICIOSOS
      if (this.caja.estado == 1) {
        let liquida = 0;
        this.tablaLiquidaciones.forEach((liqui) => {
          //RF-CAJA-02: las liquidaciones con egreso_id ya están en egresoGeneral (evita doble conteo N1/A6)
          if (!liqui.egreso_id) {
            liquida += liqui.liquido_pagar;
          }
        });
        let egreso = 0;
        this.tablaEgresos.forEach((egre) => {
          egreso += egre.monto;
        });
        this.total_ingresoMoment = servicios;
        this.total_egresoMoment = egreso + liquida + this.egresoGeneral;
        this.utilidadMoment = this.total_ingresoMoment - this.total_egresoMoment;
      }
    } //TERMINA EL IF
    this.alertaService.cerrarAlerta()
  } //TERMINA CALCULAR DATOS

  //METODO PARA IMPRIMIR O EXPORTAR PDF
  imprimir() {
    const options = {
      filename: 'DetalleCaja.pdf',
      margin: [10, 10, 10, 10],
      html2canvas: {},
      jsPDF: { orientation: 'portrait', format: 'letter' }
    };
    const content: Element = document.getElementById('imprimir');
    html2pdf().from(content).set(options).save();
  }
}
