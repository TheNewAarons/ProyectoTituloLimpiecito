import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AppUsuarioService } from 'src/app/services/appUsuario/app-usuario.service';
import swal from 'sweetalert2';

@Component({
  selector: 'app-usuario-inactivos',
  templateUrl: './usuario-inactivos.component.html',
  styleUrls: ['./usuario-inactivos.component.css']
})
export class UsuarioInactivosComponent implements OnInit {
  public usuarios;
  public loading = true;
  public page = 1;
  public pageSize = 10;
  public search = null 

  constructor(
    private appUsuarioService: AppUsuarioService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerUsuarios();
  }
  //OBTENER USUARIOS
  obtenerUsuarios() {
    this.appUsuarioService.obtenerUsuariosInactivos().subscribe(
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
  activarUsuario(idUsuario) {
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
        this.appUsuarioService.activarUsuarioApp(idUsuario).subscribe(
          (response: any) => {
            if (response.filas > 0) {
              this.loading = !this.loading;
              this.obtenerUsuarios();
              this.alertaService.alertaExitoMsj('El Usuario Ha Sido Activado.')
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
    this.appUsuarioService.buscarInactivos(this.search).subscribe(
      (response:any)=>{
        this.usuarios = response.usuarios;
      },
      error => {
        console.log(error)
      }
    )
  }
}
