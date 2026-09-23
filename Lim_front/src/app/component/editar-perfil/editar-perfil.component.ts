import { Component, OnInit } from '@angular/core';

//SERVICIOS
import { LoginService } from './../../services/login/login.service';
import { UsuarioService } from './../../services/usuario/usuario.service';

declare const $: any;
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-editar-perfil',
  templateUrl: './editar-perfil.component.html',
  styleUrls: ['./editar-perfil.component.css']
})
export class EditarPerfilComponent implements OnInit {

  public usuario;
  public usuarioLogin;
  public respuesta;
  public passNew = '';

  constructor(
    private loginService:LoginService, private usuarioService:UsuarioService,
    private alertaService:AlertasService
    ) { }

  ngOnInit() {
    this.obtenerDatosUsuario();
  }

  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario(){
    this.alertaService.loading()
    this.usuarioLogin = this.loginService.obtenerDatosUsuario();
    this.usuarioService.obtenerOneUsuario(this.usuarioLogin.id).subscribe(
      response => {
        this.alertaService.cerrarAlerta()
        this.respuesta = response;
        this.usuario = this.respuesta.usuario;
      },
      error => {
        this.alertaService.cerrarAlerta()
        console.log(error)
      }
    )
  }
  //EDITAR PERFIL
  editar(valid){
    if(valid){
      this.usuarioService.editarUsuario(this.usuario,this.usuario.id).subscribe(
        response => {
          this.respuesta = response;
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Usuario Editado Correctamente')
          }else{
            this.alertaService.alertaExitoMsj('No Se Ha Editado Ningún Campo')
          }
        },
        error => {
          console.log(error);
        }
      )
    }
  }
  //ENCRIPTAR PASSWORD
  encriptar(crypt){
    let cripto = btoa(crypt);
    return cripto;
  }
  //EDITAR PASSWORD USUARIO
  editarPasswordUsuario(valid){
    if(valid){
      let crypt = this.encriptar(this.passNew);
      this.usuario.password = crypt;
      this.usuarioService.editarPasswordUsuario(this.usuario,this.usuario.id).subscribe(
        response => {
          this.respuesta = response;
          $("#myModalEditPassword").modal('hide');
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Contraseña Editada Correctamente')
          }
          this.loginService.logout();
        },
        error => {
          console.log(error)
        }
      )
    }
  }

}
