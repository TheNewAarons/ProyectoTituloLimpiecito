import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { CatalogoItem, RespuestaCatalogo } from '../../model/catalogo-item';
import { ServicioApp } from '../../model/catalogo-item';

// CATALOGO WEB (RF-WEB-01) — /api/v1/web/catalogo (solo Admin), formato { ok, data, meta }
@Injectable({
  providedIn: 'root'
})
export class CatalogoWebService {
  public url_catalogo;
  // Origen del backend para armar las URL de imagen (imagen_url viene con el prefijo /web-limpiecito).
  public origen;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_catalogo = environment.url + '/api/v1/web/catalogo';
    this.origen = new URL(environment.url).origin;
  }

  private opciones() {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }) };
  }

  listar(): Observable<RespuestaCatalogo<CatalogoItem[]>> {
    return this.http.get<RespuestaCatalogo<CatalogoItem[]>>(this.url_catalogo, this.opciones());
  }

  //CREAR Y EDITAR VAN COMO FORMULARIO (MULTIPART) PARA PODER ADJUNTAR LA IMAGEN
  crear(datos: FormData): Observable<RespuestaCatalogo<CatalogoItem>> {
    return this.http.post<RespuestaCatalogo<CatalogoItem>>(this.url_catalogo, datos, this.opciones());
  }

  editar(id: number, datos: FormData | object): Observable<RespuestaCatalogo<CatalogoItem>> {
    return this.http.put<RespuestaCatalogo<CatalogoItem>>(this.url_catalogo + '/' + id, datos, this.opciones());
  }

  //DESPUBLICAR (EL ITEM NO SE BORRA)
  despublicar(id: number): Observable<RespuestaCatalogo<CatalogoItem>> {
    return this.http.delete<RespuestaCatalogo<CatalogoItem>>(this.url_catalogo + '/' + id, this.opciones());
  }

  //ELIMINAR DEFINITIVO (SOLO ITEMS DESPUBLICADOS)
  eliminar(id: number): Observable<RespuestaCatalogo<{ id: number }>> {
    return this.http.delete<RespuestaCatalogo<{ id: number }>>(this.url_catalogo + '/' + id + '/eliminar', this.opciones());
  }

  //ORDEN COMPLETO SEGUN LA POSICION DE CADA ID
  reordenar(ids: number[]): Observable<RespuestaCatalogo<CatalogoItem[]>> {
    return this.http.patch<RespuestaCatalogo<CatalogoItem[]>>(this.url_catalogo + '/orden', { ids: ids }, this.opciones());
  }

  //RF-WEB-01b: SERVICIOS DE LA APP DE RESERVAS PARA VINCULAR O IMPORTAR
  listarServiciosApp(): Observable<RespuestaCatalogo<ServicioApp[]>> {
    return this.http.get<RespuestaCatalogo<ServicioApp[]>>(this.url_catalogo + '/servicios-app', this.opciones());
  }

  //VINCULAR (id) O DESVINCULAR (null) UN ITEM CON UN SERVICIO DE LA APP
  vincularServicioApp(id: number, servicioId: number | null): Observable<RespuestaCatalogo<CatalogoItem>> {
    return this.http.put<RespuestaCatalogo<CatalogoItem>>(this.url_catalogo + '/' + id + '/servicio-app', { servicio_id: servicioId }, this.opciones());
  }

  //CREA UN ITEM EN BORRADOR COPIANDO NOMBRE, DESCRIPCION E IMAGEN DEL SERVICIO (QUEDA VINCULADO)
  importarServicioApp(servicioId: number): Observable<RespuestaCatalogo<CatalogoItem>> {
    return this.http.post<RespuestaCatalogo<CatalogoItem>>(this.url_catalogo + '/importar-servicio', { servicio_id: servicioId }, this.opciones());
  }
}
