import { Injectable } from '@angular/core';

import { HttpClient } from "@angular/common/http";
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AnuncioService {

  public url_backend;

  constructor(private http: HttpClient) { 
    this.url_backend = environment.url + "/anuncios_web";
  }

  //crear contactanos . genera solicitud de contacto
  crearAnuncio(anuncio) {
    // console.log(anuncio);
    let url = this.url_backend + '/crear_anuncio/crear/';
    //url += '?token=' + this._usuarioService.token;

    return this.http.post(url, anuncio);
  }

  //Editar publicacion sin imagen

  editarAnuncio(anuncio, idAnuncio) {
    return this.http.put(this.url_backend + '/editar_anuncio/editar/' + idAnuncio, anuncio);
  }

  //ELIMINAR Anuncio
  eliminarAnuncio(idAnuncio) {
    return this.http.delete(this.url_backend + '/eliminar_anuncio/eliminar/' + idAnuncio);
  }
  //OBTENER anuncios
  obtenerAnuncios() {
    return this.http.get(this.url_backend + '/obtener_anuncio/obtener/');
  }




}
