import { Component, OnInit } from '@angular/core';
//SERVICIOS
import { DescuentoService } from './../../../services/descuento/descuento.service'; 
//MODELOS
import { Seguro } from './../../../model/seguro';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-seguro',
  templateUrl: './seguro.component.html',
  styleUrls: ['./seguro.component.css']
})
export class SeguroComponent implements OnInit {

  public seguro: Seguro;
  public seguroEdit:Seguro;
  public seguros
  public segurosActivos;
  public segurosInactivos;
  public respuesta;
  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  constructor(
    private descuentoService:DescuentoService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerSegurosActivos();
    this.obtenerSegurosInactivos();
    this.seguro = new Seguro(1,"",null,1);
    this.seguroEdit = new Seguro(1,"",null,1);
  }

  //OBTENER SEGUROS ACTIVOS
  obtenerSegurosActivos(){
    this.descuentoService.obtenerSeguroActivos().subscribe(
      response => {
        this.respuesta = response;
        this.segurosActivos = this.respuesta.seguros;
      },
      error => {
        console.log(error);
      }
    )
  }
  //OBTENER SEGUROS INACTIVOS
  obtenerSegurosInactivos(){
    this.descuentoService.obtenerSeguroInactivos().subscribe(
      response => {
        this.respuesta = response;
        this.segurosInactivos = this.respuesta.seguros;
      },
      error => {
        console.log(error);
      }
    )
  }

  //CREAR SEGURO
  crearSeguro(valid){
    if(valid){
      this.descuentoService.crearSeguro(this.seguro).subscribe(
        response => {
          this.seguro = new Seguro(1,"",null,1);
          this.obtenerSegurosActivos();
          this.obtenerSegurosInactivos();
          $("#createModal").modal('hide');
          this.alertaService.alertaExitoMsj('Seguro Creado Correctamente')
        },
        error => {
          console.log(error)
        }
      )
    }
  }
  //ASIGNAR VARIABLE A EDITAR
  asignarEditar(seguro_editar){
    this.seguroEdit = Object.assign({},seguro_editar);
  }
  //EDITAR SEGURO
  editarSeguro(valid){
    if(valid){
      this.descuentoService.editarSeguro(this.seguroEdit,this.seguroEdit.id).subscribe(
        response => {
          this.respuesta = response;
          this.obtenerSegurosActivos();
          this.obtenerSegurosInactivos();
          $('#editModal').modal('hide');
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Seguro Editado Correctamente')
          }
        },
        error => {
          console.log(error);
        }
      )
    }
  }
  //ELIMINAR SEGURO
  eliminarSeguro(id){
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
        this.descuentoService.desactivarSeguro(id).subscribe(
          response =>{
            this.obtenerSegurosActivos();
            this.obtenerSegurosInactivos();
            this.alertaService.alertaExitoMsj('Seguro Ha Sido Desactivado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }
  //ACTIVAR SEGURO
  activarSeguro(id){
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
        this.descuentoService.activarSeguro(id).subscribe(
          response =>{
            this.obtenerSegurosActivos();
            this.obtenerSegurosInactivos();
            this.alertaService.alertaExitoMsj('Seguro Ha Sido Activado')
          },
          error => {
            console.log(error);
          }
        )
      }
    })
  }

}

