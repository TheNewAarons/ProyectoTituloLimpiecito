import { Component, OnInit } from '@angular/core';
//SERVICIOS
import { TrabajadorService } from './../../../services/trabajador/trabajador.service';
import { LoginService } from './../../../services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-trabajador',
  templateUrl: './trabajador.component.html',
  styleUrls: ['./trabajador.component.css']
})
export class TrabajadorComponent implements OnInit {
  public trabajadores;
  public trabajadoresInactivos;
  public respuesta;
  public searchActivo;
  public searchInactivo;

  public usuario;

  public trabajadorView: any;

  public afps;
  public saludes;
  public seguros;
  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  constructor(
    private trabajadorService: TrabajadorService, private loginService: LoginService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerActivos();
    this.obtenerInactivos();
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER TRABAJADORES ACTIVOS
  obtenerActivos() {
    this.trabajadorService.obtenerTrabajadoresActivos().subscribe((response) => {
      this.respuesta = response;
      this.trabajadores = this.respuesta.trabajadores;
    });
  }
  //OBTENER TRABAJADORES INACTIVOS
  obtenerInactivos() {
    this.trabajadorService.obtenerTrabajadoresInactivos().subscribe(
      (response) => {
        this.respuesta = response;
        this.trabajadoresInactivos = this.respuesta.trabajadores;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ELIMINAR TRABAJADOR
  eliminarTrabajador(id) {
    swal.fire({
      title: '¿Estas seguro?',
      //text: "",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.trabajadorService.eliminarTrabajador(id).subscribe(
          (response) => {
            this.obtenerActivos();
            this.obtenerInactivos();
            this.alertaService.alertaExitoMsj('Trabajador Ha Sido Desactivado')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
  //ACTIVAR TRABAJADOR
  activarTrabajador(id) {
    swal.fire({
      title: '¿Estas seguro?',
      //text: "",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.trabajadorService.activarTrabajdor(id).subscribe(
          (response) => {
            this.obtenerActivos();
            this.obtenerInactivos();
            this.alertaService.alertaExitoMsj('Trabajador Ha Sido Activado')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }

  //BUSCAR TRABAJADORES ACTIVOS
  buscarActivo() {
    this.trabajadorService.buscarActivos(this.searchActivo).subscribe(
      (response) => {
        this.respuesta = response;
        this.trabajadores = this.respuesta.trabajadores;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //BUSCAR TRABAJADORES INACTIVOS
  buscarInactivo() {
    this.trabajadorService.buscarInactivos(this.searchInactivo).subscribe(
      (response) => {
        this.respuesta = response;
        this.trabajadoresInactivos = this.respuesta.trabajadores;
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
