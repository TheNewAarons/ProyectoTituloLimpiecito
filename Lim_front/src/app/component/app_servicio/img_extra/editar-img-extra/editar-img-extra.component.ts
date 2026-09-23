import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { environment } from 'src/environments/environment';

import swal from 'sweetalert2';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-editar-img-extra',
  templateUrl: './editar-img-extra.component.html',
  styleUrls: ['./editar-img-extra.component.css']
})
export class EditarImgExtraComponent implements OnInit {

  public file: File;
  public fd = new FormData();
  public img;
  public loading = true;
  public idImg;
  public url = environment.url_short


  constructor(
    private route:ActivatedRoute, private router:Router,
    private cateServicioService:CateServicioService, private alertaService:AlertasService 
  ) { }

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID IMG
  obtenerId(){
    this.idImg = this.route.snapshot.paramMap.get('idImg')
    this.obtenerImg(this.idImg);
  }

  //OBTENER IMAGEN EXTRA
  obtenerImg(idImg){
    this.cateServicioService.obtenerImagen(idImg).subscribe(
      (response:any)=>{
        this.img = response.img
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
   crearFormData(img) {
    this.fd.append('image', this.file);
    this.fd.append('categoriaServicioId', img.categoriaServicioId);
  }

  //EDITAR IMAGEN EXTRA
  editarImg(valid){
    if (valid) {
      this.crearFormData(this.img);
      this.cateServicioService.editarImagen(this.fd,this.idImg).subscribe(
        (response: any) => {
          if (response.filas > 0) {
            this.alertaService.showNotification('Imagen Extra Editado Correctamante')
            this.router.navigateByUrl('/adm_servicio/editar-cate_servicio/'+this.img.categoriaServicioId);
          } else {
            this.alertaService.alertaErrorMsj('No se ha actualizado ningún dato')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

}
