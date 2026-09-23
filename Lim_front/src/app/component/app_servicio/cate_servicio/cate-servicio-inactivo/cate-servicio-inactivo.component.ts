import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';

declare const $: any;
import swal from 'sweetalert2';

@Component({
  selector: 'app-cate-servicio-inactivo',
  templateUrl: './cate-servicio-inactivo.component.html',
  styleUrls: ['./cate-servicio-inactivo.component.css']
})
export class CateServicioInactivoComponent implements OnInit {
  public page = 1;
  public pageSize = 15;
  public cateServicios = [];
  public loading = true;

  constructor(
    private cateServicio: CateServicioService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerCateServicios();
  }
  //OBTENER CATEGORIA SERVICIOS ACTIVOS
  obtenerCateServicios() {
    this.alertaService.loading()
    this.cateServicio.obtenerCateServicioInactivo().subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.cateServicios = response.cate_servicios;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ACTIVAR CATEGORIA SERVICIO
  activarCateServicio(idServicio) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.cateServicio.activarCateServicio(idServicio).subscribe(
          (response: any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.obtenerCateServicios();
              this.alertaService.alertaExitoMsj('Activado')
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
