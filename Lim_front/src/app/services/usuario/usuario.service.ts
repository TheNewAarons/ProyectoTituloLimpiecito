import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  public url_backend;
 
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }

  //CREAR USUARIO
  crearUsuario(usuario){
    let usuario_json = JSON.stringify(usuario);

    return this.http.post(this.url_backend+"/usuario/registro",{usuario: usuario_json});
  }

  //OBTENER USUARIOS ACTIVOS
  obtenerUsuarios(){
    return this.http.get(this.url_backend+"/usuario/obtener");
  }

  //OBTENER USUARIO INACTIVOS
  obtenerUsuariosInactivos(){
    return this.http.get(this.url_backend+"/usuario/obtener-inactivo");
  }

  //EDITAR USUARIO
  editarUsuario(usuario,id){
    let usuario_json = JSON.stringify(usuario);
    return this.http.put(this.url_backend+"/usuario/editar/"+id,{usuario:usuario_json})
  }

  //EDITAR USUARIO PASSWORD
  editarPasswordUsuario(usuario,id){
    let usuario_json = JSON.stringify(usuario);
    return this.http.put(this.url_backend+"/usuario/editar-password/"+id,{usuario: usuario_json})
  }
  //OBTENER 1 USUARIO POR ID
  obtenerOneUsuario(id){
    return this.http.get(this.url_backend+"/usuario/rescatar/"+id);
  }

  //ELIMINAR USUARIO ( CAMBIO DE ESTADO)
  eliminarUsuario(id){
    return this.http.delete(this.url_backend+"/usuario/eliminar/"+id);
  }
  //ACTIVAR USUARIO ( CAMBIO DE ESTADO)
  activarUsuario(id){
    return this.http.delete(this.url_backend+"/usuario/activar/"+id);
  }

  //BUSCAR USUARIOS ACTIVOS 
  buscarActivos(busca){
    return this.http.get(this.url_backend+"/usuario/busca-activo/"+busca);
  }

  //BUSCAR USUARIOS INACTIVOS
  buscarInactivos(busca){
    return this.http.get(this.url_backend+"/usuario/busca-inactivo/"+busca);
  }
}
