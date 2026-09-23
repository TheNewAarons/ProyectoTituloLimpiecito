import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AppUsuarioService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/usuario';
  }

  //OBTENER USUARIO APP ACTIVOS
  obtenerUsuariosActivos() {
    return this.http.get(this.url_backend + '/usuarios-activos');
  }
  //OBTENER USUARIO APP INACTIVOS
  obtenerUsuariosInactivos() {
    return this.http.get(this.url_backend + '/usuarios-inactivos');
  }
  //ACTIVAR USUARIO APP
  activarUsuarioApp(idUsuario) {
    return this.http.delete(this.url_backend + '/activar/' + idUsuario);
  }
  //DESACTIVAR USUARIO APP
  desactivarUsuarioApp(idUsuario) {
    return this.http.delete(this.url_backend + '/desactivar/' + idUsuario);
  }
  //OBTENER USUARIO APP POR ID
  obtenerUsuarioApp(idUsuario){
    return this.http.get(this.url_backend+'/obtener/'+idUsuario);
  }
  //BUSCAR EN PRODUCTOS ACTIVOS
  buscarActivos(busca) {
    return this.http.get(this.url_backend + '/busca-activo/' + busca);
  }
  //BUSCAR EN PRODUCTOS INACTIVOS
  buscarInactivos(busca) {
    return this.http.get(this.url_backend + '/busca-inactivo/' + busca);
  }
}
