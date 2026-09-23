import { Component, OnInit } from '@angular/core';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { CateServicio } from 'src/app/model/cateServicio';
import { Router } from '@angular/router';
import { Descripcion } from 'src/app/model/descripcion';
import { Herramienta } from 'src/app/model/herramienta';
import { Articulo } from 'src/app/model/articulo';

import { AlertasService } from 'src/app/services/alertas/alertas.service';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-cate-servicio',
  templateUrl: './crear-cate-servicio.component.html',
  styleUrls: ['./crear-cate-servicio.component.css']
})
export class CrearCateServicioComponent implements OnInit {
  public cateServicio: CateServicio;
  public file: File;
  public fd = new FormData();
  public text_descripcion = '';
  public text_herramienta = '';
  public text_articulo = '';
  public array_desc = [];
  public array_herra = [];
  public array_arti = [];
  public descripcion: Descripcion;
  public herramienta: Herramienta;
  public articulo: Articulo;
  public activar_cantidades = [{"valor":false,"nombre":"Desactivado"},{"valor":true,"nombre":"Activado"}]

  constructor(
    private cateService: CateServicioService, private router: Router,
    private alertaService:AlertasService  
  ) {}

  ngOnInit() {
    this.cateServicio = new CateServicio(null, null, false, 1, '');
    this.descripcion = new Descripcion(null, '', null);
    this.herramienta = new Herramienta(null, '', null);
    this.articulo = new Articulo(null, '', null);
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
  crearFormData(cateServicio) {
    this.fd.append('nombre', cateServicio.nombre);
    this.fd.append('image', this.file);
    this.fd.append('activar_cantidad', cateServicio.activar_cantidad);
    this.fd.append('estado', cateServicio.estado);
    this.fd.append('descripciones', JSON.stringify(this.array_desc));
    this.fd.append('herramientas', JSON.stringify(this.array_herra));
    this.fd.append('articulos', JSON.stringify(this.array_arti));
  }

  //CREAR CATEGORIA SERVICIO
  crearCateServicio(valid) {
    if (valid) {
      this.alertaService.loading()
      this.crearFormData(this.cateServicio);
      this.cateService.crearCategoriaServicio(this.fd).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.cate_servicio) {
            this.alertaService.showNotification('Categoria Servicio Creado Correctamante')
            this.router.navigateByUrl('/adm_servicio/cate_servicios');
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
  //Agregar descripción
  addDescripcion() {
    this.descripcion.texto = this.text_descripcion;
    this.text_descripcion = '';
    this.array_desc.push(this.descripcion);
    this.descripcion = new Descripcion(null, '', null);
  }
  //Eliminar Descripción
  eliminiarDesc(desc) {
    let pos = this.array_desc.indexOf(desc);
    this.array_desc.splice(pos, 1);
  }
  //Agregar Herramienta
  addHerramienta() {
    this.herramienta.texto = this.text_herramienta;
    this.text_herramienta = '';
    this.array_herra.push(this.herramienta);
    this.herramienta = new Herramienta(null, '', null);
  }
  //Eliminar Herramienta
  eliminarHerra(herra) {
    let pos = this.array_herra.indexOf(herra);
    this.array_herra.splice(pos, 1);
  }
  //Agregar Artículo
  addArticulo() {
    this.articulo.texto = this.text_articulo;
    this.text_articulo = '';
    this.array_arti.push(this.articulo);
    this.articulo = new Articulo(null, '', null);
  }
  //Eliminar Articulo
  eliminarArti(arti) {
    let pos = this.array_arti.indexOf(arti);
    this.array_arti.splice(pos, 1);
  }
}
