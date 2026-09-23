import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ServicioService } from 'src/app/services/servicio/servicio.service';

declare const $: any;
import swal from 'sweetalert2';

@Component({
  selector: 'app-servicio-inactivo',
  templateUrl: './servicio-inactivo.component.html',
  styleUrls: ['./servicio-inactivo.component.css']
})
export class ServicioInactivoComponent implements OnInit {
  public servicios;
  public loading = true;
  public page = 1;
  public pageSize = 15;

  constructor(
    private servicioService: ServicioService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerServiciosInactivos();
  }

  //OBTENER SERVICIOS INACTIVOS
  obtenerServiciosInactivos() {
    this.servicioService.obtenerServiciosInactivos().subscribe(
      (response: any) => {
        this.servicios = response.servicios;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ACTIVAR SERVICIO
  activarServicio(idServicio) {
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
        this.servicioService.activarServicio(idServicio).subscribe(
          (response: any) => {
            if (response.filas > 0) {
              this.loading = !this.loading;
              this.obtenerServiciosInactivos();
              this.alertaService.alertaExitoMsj('Activado')
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
