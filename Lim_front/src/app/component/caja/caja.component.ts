import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';

//SERVICIOS
import { CajaService } from './../../services/caja/caja.service';
import { LoginService } from './../../services/login/login.service';

//MODELOS
import { Caja } from '../../model/caja';

import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.css']
})
export class CajaComponent implements OnInit {

  public caja: Caja;
  public cajas;
  public caja_actual;
  public usuario;
  public page = 1;
  public pageSize = 12;

  constructor(
    private cajaService: CajaService, private loginService: LoginService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.caja = new Caja(1, null, null, null, null, null, null, null, 1, null);
    this.obtenerCajaActivaYCajas()
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER CAJA ACTIVA Y CAJAS
  obtenerCajaActivaYCajas(){
    this.alertaService.loading()
    let cajas_service = this.cajaService.obtenerSoloCajas()
    let caja_activa_service = this.cajaService.obtenerCajaActiva()
    forkJoin([cajas_service,caja_activa_service]).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.cajas = response[0].cajas
        this.caja_actual = response[1].caja
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }
  //CREAR CAJA
  crearCaja() {
    this.alertaService.loading()
    this.caja.fecha_inicio = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
    this.caja.usuarioId = this.usuario.id;
    this.cajaService.crearCaja(this.caja).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.caja = new Caja(1, null, null, null, null, null, null, null, 1, 1);
        this.obtenerCajaActivaYCajas()
        this.alertaService.alertaExitoMsj('Caja Creada Correctamente')
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //CERRAR CAJA
  cerrarCaja(idCaja) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Estas por cerrar esta caja',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Cerrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        let fecha_cierre = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
        this.cajaService.cerrarCaja(fecha_cierre, idCaja).subscribe(
          (response: any) => {
            if (response.cerrar) {
              this.alertaService.cerrarAlerta()
              this.obtenerCajaActivaYCajas()
              this.alertaService.alertaExitoMsj(response.mensaje)
            } else {
              this.alertaService.cerrarAlerta()
              this.alertaService.alertaExitoMsj(response.mensaje)
            }
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
}
