import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';

@Injectable({
  providedIn: 'root'
})
export class AnuncioService {

  public url_backend;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_backend = environment.url + "/anuncios_web";
  }

  // Obs. 24 (AUT-019): crear/editar/eliminar exigen sesión de Administrador.
  private conSesion() {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }) };
  }

  // Obs. 23: reemplazar la imagen (la ruta antigua de editar solo cambia textos).
  reemplazarImagen(idAnuncio, formData: FormData) {
    return this.http.put(environment.url + '/api/v1/web/anuncios/' + idAnuncio + '/imagen', formData, this.conSesion());
  }

  //crear contactanos . genera solicitud de contacto
  crearAnuncio(anuncio) {
    // console.log(anuncio);
    let url = this.url_backend + '/crear_anuncio/crear/';
    //url += '?token=' + this._usuarioService.token;

    return this.http.post(url, anuncio, this.conSesion());
  }

  //Editar publicacion sin imagen

  editarAnuncio(anuncio, idAnuncio) {
    return this.http.put(this.url_backend + '/editar_anuncio/editar/' + idAnuncio, anuncio, this.conSesion());
  }

  //ELIMINAR Anuncio
  eliminarAnuncio(idAnuncio) {
    return this.http.delete(this.url_backend + '/eliminar_anuncio/eliminar/' + idAnuncio, this.conSesion());
  }
  //OBTENER anuncios
  obtenerAnuncios() {
    return this.http.get(this.url_backend + '/obtener_anuncio/obtener/');
  }




}
