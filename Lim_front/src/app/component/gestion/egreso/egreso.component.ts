import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
//MODELOS
import { Egreso } from '../../../model/egreso'
//SERVICIOS
import { EgresoService } from '../../../services/egreso/egreso.service';
import { CajaService } from '../../../services/caja/caja.service';

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

  constructor(
    private egresoService:EgresoService,private cajaService:CajaService,
    private alertaService:AlertasService
  ) { }

  ngOnInit() {
    //cambiar estito pe
    this.obtenerCaja();
    this.egreso = new Egreso(1,'0',"",null,1,null,1,null);
    this.obtenerEgresos();
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
          this.egreso = new Egreso(1,'0',"",null,1,null,1,5);
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
  eliminarEgreso(id){
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
