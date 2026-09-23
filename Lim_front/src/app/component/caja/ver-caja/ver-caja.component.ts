import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { formatDate } from '@angular/common';

//MODELOS
import { Centro_costo } from '../../../model/centro_costo';

//SERVICIOS
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';
import { ClienteService } from '../../../services/cliente/cliente.service';
import { CajaService } from '../../../services/caja/caja.service';

declare const $: any;
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ver-caja',
  templateUrl: './ver-caja.component.html',
  styleUrls: ['./ver-caja.component.css']
})
export class VerCajaComponent implements OnInit {
  public clientes;
  public centro: Centro_costo;
  public idCaja;
  public caja;
  public centroEdit: Centro_costo;
  public centros;
  public page = 1;
  public pageSize = 12;

  constructor(
    private centroCostoService: CentroCostoService, private clienteService: ClienteService,
    private cajaService: CajaService, private route: Router,
    private _route: ActivatedRoute, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.centro = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
    this.obtenerId();
  }
  //OBTENER ID DE CAJA DE LA RUTA
  obtenerId() {
    this.idCaja = this._route.snapshot.paramMap.get('id');
    this.obtenerDatos();
  }
  //OBTENER CAJA, CENTROS COSTOS, CLIENTES
  obtenerDatos(){
    this.alertaService.loading()
    let caja_service = this.cajaService.obtenerCajaId(this.idCaja)
    let centro_service = this.centroCostoService.obtenerCentroCaja(this.idCaja)
    let cliente_service = this.clienteService.obtenerClientesActivos()
    forkJoin([caja_service, centro_service, cliente_service]).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.caja = response[0].caja
        this.centros = response[1].centros
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
      this.centro.cajaId = this.caja.id;
      this.centroCostoService.crearCentro(this.centro).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          this.centro = new Centro_costo(1, null, null, '0', null, null, null, 1, null, null);
          this.obtenerDatos();
          $('#createModal').modal('hide');
          this.alertaService.alertaExitoMsj('Centro de Costo Creado Correctamente!')
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

  //VOLVER A CENTROS DE COSTOS
  volver() {
    this.route.navigate(['/cajas']);
  }
}
