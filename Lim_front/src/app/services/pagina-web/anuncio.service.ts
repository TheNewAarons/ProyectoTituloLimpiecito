import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';
import { Publicacion } from '../../model/publicacion';

@Injectable({
  providedIn: 'root'
})
export class AnuncioService {

  public url_backend;
  // RF-WEB-03: los anuncios se administran como publicaciones (con fecha de publicación y expiración opcional).
  private url_publicaciones = environment.url + '/api/v1/web/publicaciones';

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_backend = environment.url + "/anuncios_web";
  }

  // Obs. 24 (AUT-019): crear/editar/eliminar exigen sesión de Administrador.
  private conSesion() {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }) };
  }

  listarPublicaciones(): Observable<Publicacion[]> {
    return this.http.get<{ data: Publicacion[] }>(this.url_publicaciones, this.conSesion()).pipe(map((r) => r.data));
  }

  obtenerPublicacion(id: number): Observable<Publicacion> {
    return this.http.get<{ data: Publicacion }>(this.url_publicaciones + '/' + id, this.conSesion()).pipe(map((r) => r.data));
  }

  crearPublicacion(fd: FormData): Observable<Publicacion> {
    return this.http.post<{ data: Publicacion }>(this.url_publicaciones, fd, this.conSesion()).pipe(map((r) => r.data));
  }

  editarPublicacion(id: number, fd: FormData): Observable<Publicacion> {
    return this.http.put<{ data: Publicacion }>(this.url_publicaciones + '/' + id, fd, this.conSesion()).pipe(map((r) => r.data));
  }

  // DELETE despublica (no borra): deja de mostrarse en la web y puede volver a publicarse editándola.
  despublicarPublicacion(id: number): Observable<Publicacion> {
    return this.http.delete<{ data: Publicacion }>(this.url_publicaciones + '/' + id, this.conSesion()).pipe(map((r) => r.data));
  }

  //ELIMINAR Anuncio (solo anuncios antiguos, sin fechas)
  eliminarAnuncio(idAnuncio) {
    return this.http.delete(this.url_backend + '/eliminar_anuncio/eliminar/' + idAnuncio, this.conSesion());
  }
  //OBTENER anuncios (lo que ve la web pública: publicaciones vigentes + anuncios antiguos)
  obtenerAnuncios() {
    return this.http.get(this.url_backend + '/obtener_anuncio/obtener/');
  }

}
