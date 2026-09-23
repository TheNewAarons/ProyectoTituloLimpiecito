import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Img_extra } from 'src/app/model/img_extra';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';

import swal from 'sweetalert2';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-img-extra',
  templateUrl: './crear-img-extra.component.html',
  styleUrls: ['./crear-img-extra.component.css']
})
export class CrearImgExtraComponent implements OnInit {

  public file: File;
  public fd = new FormData();
  public idCateServicio;
  public Img:Img_extra;

  constructor(
    private route:ActivatedRoute, private router:Router,
    private cateServicioService:CateServicioService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID
  obtenerId(){
    this.idCateServicio = this.route.snapshot.paramMap.get('idCateServicio');
    this.Img = new Img_extra('',this.idCateServicio);
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
   crearFormData(img) {
    this.fd.append('image', this.file);
    this.fd.append('categoriaServicioId', img.categoriaServicioId);
  }

  //CREAR IMAGEN EXTRA
  crearImg(valid){
    if (valid) {
      this.crearFormData(this.Img);
      this.cateServicioService.crearImagen(this.fd).subscribe(
        (response: any) => {
          if (response.img) {
            this.alertaService.showNotification('Imagen Extra Creado Correctamante')
            this.router.navigateByUrl('/adm_servicio/ver-cate_servicio/'+this.idCateServicio);
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
