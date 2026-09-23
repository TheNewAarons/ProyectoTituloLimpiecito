import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AppUsuarioService } from 'src/app/services/appUsuario/app-usuario.service';

import swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-activos',
  templateUrl: './usuario-activos.component.html',
  styleUrls: ['./usuario-activos.component.css']
})
export class UsuarioActivosComponent implements OnInit {
  public usuarios;
  public loading = true;
  public page = 1;
  public pageSize = 10;
  public search = null

  constructor(
    private appUsuarioService: AppUsuarioService,private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerUsuarios();
  }
  //OBTENER USUARIOS
  obtenerUsuarios() {
    this.appUsuarioService.obtenerUsuariosActivos().subscribe(
      (response: any) => {
        this.usuarios = response.usuarios;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //DESACTIVAR USUARIO
  desactivarUsuario(idUsuario) {
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
        this.appUsuarioService.desactivarUsuarioApp(idUsuario).subscribe(
          (response: any) => {
            if (response.filas > 0) {
              this.loading = !this.loading;
              this.obtenerUsuarios();
              this.alertaService.alertaExitoMsj('El Usuario Ha Sido Desactivado.')
            }
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
  //BUSCAR
  buscar(){
    this.appUsuarioService.buscarActivos(this.search).subscribe(
      (response:any)=>{
        this.usuarios = response.usuarios;
      },
      error => {
        console.log(error)
      }
    )
  }
}
