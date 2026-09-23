import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ServicioService } from 'src/app/services/servicio/servicio.service';

declare const $: any;
import swal from 'sweetalert2';

@Component({
  selector: 'app-servicio-activo',
  templateUrl: './servicio-activo.component.html',
  styleUrls: ['./servicio-activo.component.css']
})
export class ServicioActivoComponent implements OnInit {
  public page = 1;
  public pageSize = 15;
  public servicios = [];
  public loading = true;

  constructor(
    private servicioService: ServicioService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerServicios();
  }

  //OBTENER SERVICIOS
  obtenerServicios() {
    this.servicioService.obtenerServiciosActivos().subscribe(
      (response: any) => {
        this.servicios = response.servicios;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //DESACTIVAR SERVICIO
  desactivarServicio(idServicio) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.servicioService.desactivarServicio(idServicio).subscribe(
          (response: any) => {
            if (response.filas > 0) {
              this.loading = !this.loading;
              this.obtenerServicios();
              this.alertaService.alertaExitoMsj('Desactivado!')
            }
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
}
