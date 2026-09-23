import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Instructivo } from 'src/app/model/instructivo';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { InstructivoService } from 'src/app/services/instructivo/instructivo.service';

import swal from 'sweetalert2';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-instructivo',
  templateUrl: './crear-instructivo.component.html',
  styleUrls: ['./crear-instructivo.component.css']
})
export class CrearInstructivoComponent implements OnInit {
  public file: File;
  public fd = new FormData();
  public loading = true;
  public categorias = [];
  public instructivo:Instructivo;

  constructor(
    private instructivoService:InstructivoService, private cateServicio:CateServicioService,
    private router:Router, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.instructivo = new Instructivo('','',null)
    this.obtenerCateServicios()
  }

  //OBTENER CATEGORIA SERVICIOS
  obtenerCateServicios(){
    this.cateServicio.obtenerCateServicioActivo().subscribe(
      (response:any)=>{
        this.categorias = response.cate_servicios;
        this.loading = !this.loading
      },
      error => {
        console.log(error);
      }
    )
  }
  imagenSelecionado(event: HtmlInputEvent) {
    if (event) {
      // console.log(event.target.files[0].type);
      if (event.target.files && event.target.files[0]) {
        this.file = event.target.files[0];
        if (this.file.type != 'image/jpeg' && this.file.type != 'image/png') {
          this.file = null;
          alert('Suba un archivo PNG o JPG');
        }
      }
    }
  }
  //CREAR FORM DATA
  crearFormData(instructivo) {
    this.fd.append('nombre', instructivo.nombre);
    this.fd.append('image', this.file);
    this.fd.append('categoriaServicioId', instructivo.categoriaServicioId);
  }
  //CREAR INSTRUCTIVO
  crearInstructivo(valid) {
    if (valid) {
      this.crearFormData(this.instructivo);
      this.instructivoService.crearInstructivo(this.fd).subscribe(
        (response: any) => {
          if (response.instructivo) {
            this.alertaService.showNotification('Instructivo Creado Correctamante')
            this.router.navigateByUrl('/adm_servicio/instructivos');
          } else {
            this.alertaService.alertaErrorMsj(response.mensaje)
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

}
