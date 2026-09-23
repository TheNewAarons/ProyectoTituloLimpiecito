import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment'

//MODELOS
import { Usuario } from '../../model/usuario';

//INTERFACES
export interface TokenResponse{
  token:string
}

export interface UsuarioDetalle{
  id:number
  nombre:string
  apellido:string
  password: string
  correo: string
  rut:string
  //telefono:number
  estado: string
  roleId: number
  exp: number
  iat: number
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private token:string;
  private tok:string;
  
  public url_backend;
  public url_backend_app
 
  constructor(private http:HttpClient, private router:Router) {
    this.url_backend = environment.url;
    this.url_backend_app = environment.url;
   }
  //GUARDAR TOKEN
  public saveToken(token:string): void{
    localStorage.setItem('usuarioToken', token)
    this.token=token
  }
  //OBTENER TOKEN
  public getToken(): string {
    if(!this.token) {
        this.token= localStorage.getItem('usuarioToken')
    }
    return this.token
  }
  //CERRAR SESIÓN 
  public logout(): void{
    this.token = ''
    window.localStorage.removeItem('usuarioToken')
    this.router.navigateByUrl('/')
  } 
  //INICIAR SESION
  public login(usuario){
    let usuario_json = JSON.stringify(usuario);

    return this.http.post(this.url_backend+"/usuario/login",{usuario: usuario_json})
  }
  //OBTENER DETALLES USUARIOS
  public getUsuarioDetalles(): UsuarioDetalle{
    const token = this.getToken()
    let payload 
    if(token){
        payload = token.split('.')[1]
        payload = window.atob(payload)
        return JSON.parse(payload)
    }else{
        return null
    }
  }
  //COMPROBAR SI SE ENCUENTRA LOGEADO Y VIENDO EL TIME
  public isLoggedIn(): boolean{
    const usuario = this.getUsuarioDetalles()
    if(usuario){
        return usuario.exp > Date.now()/1000
    }else{
        return false
    }
  }
  //PARA OBTENER LOS DATOS DE LA PERSONA LOGEADA
  public obtenerDatosUsuario(){
    const usuario = this.getUsuarioDetalles()
    if(usuario){
        return usuario;
    }else{
        return false;
    }
  }

  /*** RECUPERAR CONTRASEÑA USUARIO SISTEMA */
  recuperarPass(correo){
    return this.http.post(this.url_backend+"/recuperar/recuperar-password",{correo});
  }

  cambiarPass(id, correo, pass, newPass){
    return this.http.post(this.url_backend+"/recuperar/cambiar-password",{id,correo,pass,newPass})
  } 

  /** RECUPERAR CONTRASEÑA USUARIO APP */
  cambiarPasApp(id,correo, pass, newPass){
    return this.http.post(this.url_backend_app+"/app_lim/recuperar/cambiar-password",{id,correo,pass,newPass})
  }


}
