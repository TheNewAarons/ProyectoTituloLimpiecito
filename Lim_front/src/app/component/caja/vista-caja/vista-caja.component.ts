import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as html2pdf from 'html2pdf.js';

//SERVICIOS
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';
import { CajaService } from '../../../services/caja/caja.service';
import { EgresoService } from '../../../services/egreso/egreso.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';

export class detalleLiquidacion {
  constructor(public trabajador: string, public numero_cc: number, public cliente: string, public liquido_pagar: number) {}
}
export class detalleInsumo {
  constructor(public producto: string, public cantidad: number, public total: number) {}
}
export class detalleEgreso {
  constructor(public numero_cc: number, public centro: string, public monto: number) {}
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
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.detalleLiquidacion = new detalleLiquidacion('', null, '', 0);
    this.detalleInsumo = new detalleInsumo('', 0, 0);
    this.detalleEgreso = new detalleEgreso(null, '', 0);
    this.idCaja = this._route.snapshot.paramMap.get('id');
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
        this.calcularDatos();
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
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
              this.tablaLiquidaciones.push(this.detalleLiquidacion);
              this.detalleLiquidacion = new detalleLiquidacion('', null, '', 0);
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
          liquida += liqui.liquido_pagar;
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
