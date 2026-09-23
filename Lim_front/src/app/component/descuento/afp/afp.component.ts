import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'

//SERVICIOS
import { DescuentoService } from './../../../services/descuento/descuento.service'; 

//MODELOS
import { Afp } from './../../../model/afp';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-afp',
  templateUrl: './afp.component.html',
  styleUrls: ['./afp.component.css']
})
export class AfpComponent implements OnInit {

  public afp: Afp;
  public afpEdit: Afp;
  public afps;
  public afpsActivos;
  public afpsInactivos;
  public respuesta;
  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  constructor(
    private descuentoService:DescuentoService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerAfpsActivos();
    this.obtenerAfpsInactivos();
    this.afp = new Afp(1,"",null,1);
    this.afpEdit = new Afp(1,"",null,1);
  }


  //OBTENER AFP ACTIVOS
  obtenerAfpsActivos(){
    this.descuentoService.obtenerActivosAfp().subscribe(
      response => {
        this.respuesta = response;
        this.afpsActivos = this.respuesta.afps;
      },
      error => {
        console.log(error)
      }
    )
  }
  //OBTENER AFP INACTIVOS
  obtenerAfpsInactivos(){
    this.descuentoService.obtenerInactivosAfp().subscribe(
      response => {
        this.respuesta = response;
        this.afpsInactivos = this.respuesta.afps;
      },
      error => {
        console.log(error)
      }
    )
  }

  //CREAR AFP
  crearAfp(valid){
    if(valid){
      this.descuentoService.crearAfp(this.afp).subscribe(
        response => {
          this.afp = new Afp(1,"",null,1);
          this.obtenerAfpsActivos();
          $("#createModal").modal('hide');
          this.alertaService.alertaExitoMsj('Previsión Creada Correctamente')
        },
        error => {
          console.log(error)
        }
      )
    }
  }
  //ASIGNAR VARIABLE A EDITAR
  asignarEditar(afp_editar){
    this.afpEdit = Object.assign({}, afp_editar);
  }
  //EDITAR AFP
  editarAfp(valid){
    if(valid){
      this.descuentoService.editarAfp(this.afpEdit,this.afpEdit.id).subscribe(
        response => {
          this.respuesta = response;
          this.obtenerAfpsActivos();
          this.obtenerAfpsInactivos();
          $("#editModal").modal('hide');
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Previsión Editada Correctamente')
          }
        },
        error => {
          console.log(error);
        }
      )
    } 
  }
  //ELIMINAR AFP
  eliminarAfp(id){
    swal.fire({
      title: '¿Estas seguro?',
      text: "",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.descuentoService.desactivarAfp(id).subscribe(
          response =>{
            this.obtenerAfpsActivos();
            this.obtenerAfpsInactivos();
            this.alertaService.alertaExitoMsj('Afp Ha Sido Desactivado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }
  //ACTIVAR AFP
  activarAfp(id){
    swal.fire({
      title: '¿Estas seguro?',
      text: "",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.descuentoService.activarAfp(id).subscribe(
          response =>{
            this.obtenerAfpsActivos();
            this.obtenerAfpsInactivos();
            this.alertaService.alertaExitoMsj('Afp Ha Sido Activado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }

}
