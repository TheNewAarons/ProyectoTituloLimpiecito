import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ServicioService } from 'src/app/services/servicio/servicio.service';
import { Servicio } from 'src/app/model/servicio';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';

import { AlertasService } from 'src/app/services/alertas/alertas.service';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-servicio',
  templateUrl: './crear-servicio.component.html',
  styleUrls: ['./crear-servicio.component.css']
})
export class CrearServicioComponent implements OnInit {
  public servicio: Servicio;
  public file: File;
  public cateServicioListo = true;
  public fd = new FormData();
  public categorias = [];

  constructor(
    private router: Router, private servicioService: ServicioService,
    private cateService: CateServicioService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerCateServicios();
    this.servicio = new Servicio(null, '', '', null, 1, '', null);
  }

  //OBTENER CATEGORIA SERVICIOS ACTIVOS
  obtenerCateServicios() {
    this.cateService.obtenerCateServicioActivo().subscribe(
      (response: any) => {
        this.categorias = response.cate_servicios;
        this.cateServicioListo = false;
        // console.log(this.cateServicios);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  imagenSelecionado(event: HtmlInputEvent) {
    if (event) {
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
  crearFormData(servicio) {
    this.fd.append('nombre', servicio.nombre);
    this.fd.append('image', this.file);
    this.fd.append('descripcion', servicio.descripcion);
    this.fd.append('precio', servicio.precio);
    this.fd.append('estado', servicio.estado);
    this.fd.append('categoriaServicioId', servicio.categoriaServicioId);
  }

  //CREAR SERVICIO
  crearServicio(valid) {
    if (valid) {
      this.crearFormData(this.servicio);
      this.servicioService.crearServicio(this.fd).subscribe(
        (response: any) => {
          if (response.servicio) {
            this.alertaService.showNotification('Servicio Creado Correctamante')
            this.router.navigateByUrl('/adm_servicio/servicios');
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
