import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';

declare const $: any;
import swal from 'sweetalert2';

@Component({
  selector: 'app-cate-servicio-activo',
  templateUrl: './cate-servicio-activo.component.html',
  styleUrls: ['./cate-servicio-activo.component.css']
})
export class CateServicioActivoComponent implements OnInit {
  public page = 1;
  public pageSize = 15;
  public cateServicios = [];

  constructor(
    private cateServicio: CateServicioService,private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerCateServicios();
  }
  //OBTENER CATEGORIA SERVICIOS ACTIVOS
  obtenerCateServicios() {
    this.alertaService.loading()
    this.cateServicio.obtenerCateServicioActivo().subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.cateServicios = response.cate_servicios;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }

  //DESACTIVAR CATEGORIA SERVICIO
  desactivarCateServicio(idServicio) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Desactivar!',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.cateServicio.desactivarCateServicio(idServicio).subscribe(
          (response: any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.obtenerCateServicios();
              this.alertaService.alertaExitoMsj('Desactivado')
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
