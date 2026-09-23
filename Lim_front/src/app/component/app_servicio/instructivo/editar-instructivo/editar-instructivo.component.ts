import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { InstructivoService } from 'src/app/services/instructivo/instructivo.service';
import { environment } from 'src/environments/environment';

import swal from 'sweetalert2';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-editar-instructivo',
  templateUrl: './editar-instructivo.component.html',
  styleUrls: ['./editar-instructivo.component.css']
})
export class EditarInstructivoComponent implements OnInit {

  public file: File;
  public fd = new FormData();
  public idInstructivo;
  public instructivo;
  public loading = true;
  public categorias = []
  public url = environment.url_short;

  constructor(
    private instructivoService:InstructivoService, private cateServicio:CateServicioService,
    private router:Router, private route:ActivatedRoute,
    private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID
  obtenerId(){
    this.idInstructivo = this.route.snapshot.paramMap.get('idInstructivo');
    this.obtenerInstructivo(this.idInstructivo);
  }
  //OBTENER INSTRUCTIVO
  obtenerInstructivo(idInstructivo){
    this.instructivoService.obtenerInstructivo(idInstructivo).subscribe(
      (response:any)=>{
        this.instructivo = response.instructivo;
        this.obtenerCateServicios();
      },
      error => {
        console.log(error)
      }
    )
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
  //EDITAR Instructivo
  editarInstructivo(valid) {
    if (valid) {
      this.crearFormData(this.instructivo);
      this.instructivoService.editarInstructivoo(this.fd, this.idInstructivo).subscribe(
        (response: any) => {
          if (response.filas > 0) {
            this.alertaService.showNotification('Instructivo Editado Correctamante')
            this.router.navigateByUrl('/adm_servicio/instructivos');
          } else {
            this.alertaService.alertaError()
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

}
