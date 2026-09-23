import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { Router } from '@angular/router';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-editar-cate-servicio',
  templateUrl: './editar-cate-servicio.component.html',
  styleUrls: ['./editar-cate-servicio.component.css']
})
export class EditarCateServicioComponent implements OnInit {
  public cateServicio:any;
  public idCateServicio;
  public file: File;
  public fd = new FormData();
  public activar_cantidades = [{"valor":false,"nombre":"Desactivado"},{"valor":true,"nombre":"Activado"}]

  constructor(
    private route: ActivatedRoute, private cateService: CateServicioService,
    private alertaService: AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID URL
  obtenerId() {
    this.idCateServicio = this.route.snapshot.paramMap.get('idCateServicio');
    this.obtenerCateServicio(this.idCateServicio);
  }

  //OBTENER CATEGORIA SERVICIO
  obtenerCateServicio(idServicio) {
    this.alertaService.loading()
    this.cateService.obtenerCateServicio(idServicio).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.cateServicio = response.cate_servicio;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }

  imagenSelecionado(event: HtmlInputEvent) {
    if (event) {
      console.log(event.target.files[0].type);
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
  }

  //VACIAR FORM DATA
  vaciarFormData() {
    this.fd = new FormData();
  }

  //EDITAR CATEGORIA SERVICIO
  editarCateServicio(valid) {
    if (valid) {
      this.alertaService.loading()
      this.crearFormData(this.cateServicio);
      this.cateService.editarCategoriaServicio(this.fd, this.idCateServicio).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.filas > 0) {
            this.vaciarFormData();
            this.obtenerCateServicio(this.idCateServicio);
            this.alertaService.alertaExitoMsj(response.mensaje)
          } else {
            this.alertaService.alertaErrorMsj('No hubo cambios')
          }
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //EDITAR DESCRIPCION
  editarDescripcion(desc) {
    this.alertaService.loading()
    this.cateService.editarDescripcion(desc, desc.id).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        if (response.filas > 0) {
          this.obtenerCateServicio(this.idCateServicio);
          this.alertaService.alertaExitoMsj(response.mensaje)
        } else {
          this.alertaService.alertaErrorMsj('No hubo cambios')
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }

  //ELIMINAR DESCRIPCION
  eliminarDescripcion(idDescripcion) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Borrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.cateService.eliminarDescripcion(idDescripcion).subscribe(
          (response: any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.obtenerCateServicio(this.idCateServicio);
              this.alertaService.alertaExitoMsj('Borrado!')
            } else {
              this.alertaService.alertaErrorMsj('Hubo problemas para eliminar')
            }
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }

  //EDITAR HERRAMIENTA
  editarHerramienta(herra) {
    this.alertaService.loading()
    this.cateService.editarHerramienta(herra, herra.id).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        if (response.filas > 0) {
          this.obtenerCateServicio(this.idCateServicio);
          this.alertaService.alertaExitoMsj(response.mensaje)
        } else {
          this.alertaService.alertaErrorMsj('No hubo cambios')

        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }

  //ELIMINAR HERRAMIENTA
  eliminarHerramienta(idHerramienta) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Borrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.cateService.eliminarHerramienta(idHerramienta).subscribe(
          (response: any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.obtenerCateServicio(this.idCateServicio);
              this.alertaService.alertaExitoMsj('Borrado!')
            } else {
              this.alertaService.alertaErrorMsj('Hubo Problemas Al Eliminar')
            }
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }

  //EDITAR ARTICULO
  editarArticulo(arti) {
    this.alertaService.loading()
    this.cateService.editarArticulo(arti, arti.id).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        if (response.filas > 0) {
          this.obtenerCateServicio(this.idCateServicio);
          this.alertaService.alertaExitoMsj(response.mensaje)
        } else {
          this.alertaService.alertaErrorMsj('No Hubo Cambios')
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }

  //ELIMINAR ARTICULO
  eliminarArticulo(idArticulo) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Borrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.cateService.eliminarArticulo(idArticulo).subscribe(
          (response: any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.obtenerCateServicio(this.idCateServicio);
              this.alertaService.alertaExitoMsj('Borrado!')
            } else {
              this.alertaService.alertaErrorMsj('Hubo problemas para eliminar')
            }
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
}
