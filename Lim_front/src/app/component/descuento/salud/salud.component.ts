import { Component, OnInit } from '@angular/core';
//SERVICIOS
import { DescuentoService } from './../../../services/descuento/descuento.service'; 

//MODELOS
import { Salud } from './../../../model/salud';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-salud',
  templateUrl: './salud.component.html',
  styleUrls: ['./salud.component.css']
})
export class SaludComponent implements OnInit {

  public salud: Salud;
  public saludEdit: Salud;
  public saludesActivos;
  public saludesInactivos;
  public respuesta;
  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  constructor(
    private descuentoService:DescuentoService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerSaludesActivos();
    this.obtenerSaludesInactivos();
    this.salud = new Salud(1,"",null,1);
    this.saludEdit = new Salud(1,"",null,1);
  }
  //OBTENER SALUDES ACTIVOS
  obtenerSaludesActivos(){
    this.descuentoService.obtenerSaludActivos().subscribe(
      response =>  {
        this.respuesta = response;
        this.saludesActivos = this.respuesta.saludes;
      },
      error => {
        console.log(error)
      }
    )
  }
  //OBTENER SALUDES INACTIVAS
  obtenerSaludesInactivos(){
    this.descuentoService.obtenerSaludInactivos().subscribe(
      response =>  {
        this.respuesta = response;
        this.saludesInactivos = this.respuesta.saludes;
      },
      error => {
        console.log(error)
      }
    )
  }
  //CREAR SALUD
  crearSalud(valid){
    if(valid){
      this.descuentoService.crearSalud(this.salud).subscribe(
        response => {
          this.salud = new Salud(1,"",null,1);
          this.obtenerSaludesActivos();
          this.obtenerSaludesInactivos();
          $("#createModal").modal('hide');
          this.alertaService.alertaExitoMsj('Creado Correctamente')
        },
        error => {
          console.log(error)
        }
      )
    }
  }
  //ASIGNAR VARIABLE A EDITAR
  asignarEditar(salud_editar){
    this.saludEdit = Object.assign({},salud_editar);
  }
  //EDITAR SALUD
  editarSalud(){
    this.descuentoService.editarSalud(this.saludEdit,this.saludEdit.id).subscribe(
      response => {
        this.respuesta = response;
        this.obtenerSaludesActivos();
          this.obtenerSaludesInactivos();
        $("#editModal").modal('hide');
        if(this.respuesta.filas != 0){
          this.alertaService.alertaExitoMsj('Editado Correctamente')
        }
      },
      error => {
        console.log(error);
      }
    )
  }
  //ELIMINAR SALUD
  eliminarSalud(id){
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
        this.descuentoService.desactivarSalud(id).subscribe(
          response =>{
            this.obtenerSaludesActivos();
            this.obtenerSaludesInactivos();
            this.alertaService.alertaExitoMsj('Salud Ha Sido Desactivado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }
  //ACTIVAR SALUD
  activarSalud(id){
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
        this.descuentoService.activarSalud(id).subscribe(
          response =>{
            this.obtenerSaludesActivos();
            this.obtenerSaludesInactivos();
            this.alertaService.alertaExitoMsj('Salud Ha Sido Activado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }
}
