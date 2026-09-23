import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ServicioService } from 'src/app/services/servicio/servicio.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';

import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-editar-servicio',
  templateUrl: './editar-servicio.component.html',
  styleUrls: ['./editar-servicio.component.css']
})
export class EditarServicioComponent implements OnInit {
  public servicio;
  public idServicio;
  public file: File;
  public fd = new FormData();
  public loading = true;
  public cateServicioListo = true;
  public categorias = [];

  constructor(
    private router: Router,private servicioService: ServicioService,
    private route: ActivatedRoute,private cateService: CateServicioService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.obtenerCateServicios();
  }

  //OBTENER ID SERVICIO
  obtenerId() {
    this.idServicio = this.route.snapshot.paramMap.get('idServicio');
    this.obtenerServicio(this.idServicio);
  }
  //OBTENER CATEGORIA SERVICIOS ACTIVOS
  obtenerCateServicios() {
    this.cateService.obtenerCateServicioActivo().subscribe(
      (response: any) => {
        this.categorias = response.cate_servicios;
        this.cateServicioListo = false;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //OBTENER SERVICIO POR ID
  obtenerServicio(idServicio) {
    this.servicioService.obtenerServicio(idServicio).subscribe(
      (response: any) => {
        this.servicio = response.servicio;
        this.loading = !this.loading;
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

  //EDITAR SERVICIO
  editarServicio(valid) {
    if (valid) {
      this.crearFormData(this.servicio);
      this.servicioService.editarServicio(this.fd, this.idServicio).subscribe(
        (response: any) => {
          if (response.filas > 0) {
            this.alertaService.showNotification('Servicio Editado Correctamente')
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
