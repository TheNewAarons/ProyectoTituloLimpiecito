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
  obtenerDatos(){
    let centro_activo_service = this.centroCostoService.obtenerActivos(this.caja_activa.id)
    let centro_inactivo_service = this.centroCostoService.obtenerInactivos(this.caja_activa.id)
    let cliente_service = this.clienteService.obtenerClientesActivos()
    forkJoin([centro_activo_service,centro_inactivo_service,cliente_service]).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
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
