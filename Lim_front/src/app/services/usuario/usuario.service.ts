import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  public url_backend;
 
  constructor(private http:HttpClient, private loginService:LoginService) {
    this.url_backend = environment.url;
  }

  // RNF-SEC-01 (AUT-006): las rutas /usuario exigen sesión.
  private opciones() {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }) };
  }

  //CREAR USUARIO
  crearUsuario(usuario){
    let usuario_json = JSON.stringify(usuario);

    return this.http.post(this.url_backend+"/usuario/registro",{usuario: usuario_json}, this.opciones());
  }

  //OBTENER USUARIOS ACTIVOS
  obtenerUsuarios(){
    return this.http.get(this.url_backend+"/usuario/obtener", this.opciones());
  }

  //OBTENER USUARIO INACTIVOS
  obtenerUsuariosInactivos(){
    return this.http.get(this.url_backend+"/usuario/obtener-inactivo", this.opciones());
  }

  //EDITAR USUARIO
  editarUsuario(usuario,id){
    let usuario_json = JSON.stringify(usuario);
    return this.http.put(this.url_backend+"/usuario/editar/"+id,{usuario:usuario_json}, this.opciones())
  }

  //EDITAR USUARIO PASSWORD
  editarPasswordUsuario(usuario,id){
    let usuario_json = JSON.stringify(usuario);
    return this.http.put(this.url_backend+"/usuario/editar-password/"+id,{usuario: usuario_json}, this.opciones())
  }
  //OBTENER 1 USUARIO POR ID
  obtenerOneUsuario(id){
    return this.http.get(this.url_backend+"/usuario/rescatar/"+id, this.opciones());
  }

  //ELIMINAR USUARIO ( CAMBIO DE ESTADO)
  eliminarUsuario(id){
    return this.http.delete(this.url_backend+"/usuario/eliminar/"+id, this.opciones());
  }
  //ACTIVAR USUARIO ( CAMBIO DE ESTADO)
  activarUsuario(id){
    return this.http.delete(this.url_backend+"/usuario/activar/"+id, this.opciones());
  }

  //BUSCAR USUARIOS ACTIVOS 
  buscarActivos(busca){
    return this.http.get(this.url_backend+"/usuario/busca-activo/"+busca, this.opciones());
  }

  //BUSCAR USUARIOS INACTIVOS
  buscarInactivos(busca){
    return this.http.get(this.url_backend+"/usuario/busca-inactivo/"+busca, this.opciones());
  }
}
