import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { InstructivoService } from 'src/app/services/instructivo/instructivo.service';

import swal from 'sweetalert2';

@Component({
  selector: 'app-instructivos',
  templateUrl: './instructivos.component.html',
  styleUrls: ['./instructivos.component.css']
})
export class InstructivosComponent implements OnInit {

  public page =1;
  public pageSize = 10;
  public loading = true;
  public instructivos = [];

  constructor(
    private instructivoService:InstructivoService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerInstructivos();
  }
  //OBTENER INSTRUCTIVOS
  obtenerInstructivos(){
    this.instructivoService.obtenerInstructivos().subscribe(
      (response:any)=>{
        this.instructivos = response.instructivos;
        this.loading = !this.loading;
      },
      error => {
        console.log(error);
      }
    )
  }

  //ELIMINAR PRODUCTO
  eliminarInstructivo(idInstructivo) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.instructivoService.eliminarInstructivo(idInstructivo).subscribe(
          (response:any)=>{
            if(response.filas > 0){
              this.loading = !this.loading;
              this.obtenerInstructivos()
              this.alertaService.alertaExitoMsj('Instructivo Eliminado Correctamante')
            }else{
              this.alertaService.alertaError()
            }
          },
          error => {
            console.log(error);
          }
        )
      }
    });
  }
}
