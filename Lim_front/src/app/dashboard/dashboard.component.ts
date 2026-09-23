import { Component, OnInit, AfterViewInit } from '@angular/core';

//SERVICIOS
import { CentroCostoService } from './../services/centro_costo/centro-costo.service';
import { CajaService } from './../services/caja/caja.service';
import { EgresoService } from './../services/egreso/egreso.service';
import { AlertasService } from '../services/alertas/alertas.service';
import { forkJoin } from 'rxjs';


declare const $: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  public total_servicios = 0;
  public total_insumos = 0;
  public total_egresos_cc = 0;
  public total_egresosCC_general = 0;
  public total_liquidaciones = 0;
  public total_cc_activos = 0;

  public respuesta;
  public caja_activa;
  public centros;
  public egresos;

  constructor(
    private centroCostoService:CentroCostoService, private cajaService:CajaService,
    private egresoService:EgresoService, private alertaService:AlertasService
  ){}

  public ngOnInit() {
    this.obtenerCajaActiva();
   }

  //OBTENER DATOS ( EGRESOS Y CENTROS COSTOS CAJA ACTUAL)
  obtenerDatos(){
    let centro_costo_service = this.centroCostoService.obtenerCentroCaja(this.caja_activa.id)
    let egreso_service = this.egresoService.obtenerEgresosCaja(this.caja_activa.id)
    forkJoin([centro_costo_service,egreso_service]).subscribe(
      response => {
        this.respuesta = response
        this.centros = this.respuesta[0].centros;
        this.egresos = this.respuesta[1].egresos;
        this.calcularIndicacodores();
      }
    )
  }
  //OBTENER CAJA ACTIVA
  obtenerCajaActiva(){
    this.alertaService.loading()
    this.cajaService.obtenerCajaActiva().subscribe(
      response => {
        this.respuesta = response;
        this.caja_activa = this.respuesta.caja;
        if(this.caja_activa != null){
          this.obtenerDatos()
        }else{
          this.alertaService.cerrarAlerta()
        }
      },
      error => {
        console.log(error);
      }
    )
  }
  //CALCULAR INDICADORES
  calcularIndicacodores(){
    let egreso_general = 0;
    //calcular egresos general
    this.egresos.forEach(elemento => {
      egreso_general += elemento.monto;
    });
    //calcular lo demas del centro de costos
    this.centros.forEach(element => {
      this.total_servicios += element.precio_servicio;
      if(element.estado == 1){
        this.total_cc_activos++;
      }
      //calcula egresos del cc
      element.cc_egresos.forEach(egre => {
        this.total_egresos_cc += egre.monto;
      });
      //calcular total insumos
      element.lista_insumos.forEach(lista => {
        this.total_insumos += lista.total;
      });
      //calcular valor de liquidaciones
      element.centro_costo_trabajadores.forEach(centroTraba => {
        if(centroTraba.liquidacione){
          this.total_liquidaciones += centroTraba.liquidacione.liquido_pagar;
        }
      });
    });
    //calcular total egresos, egresosCC+egresosGeneral
    this.total_egresosCC_general = this.total_egresos_cc + egreso_general;
    this.alertaService.cerrarAlerta()
  }



}
