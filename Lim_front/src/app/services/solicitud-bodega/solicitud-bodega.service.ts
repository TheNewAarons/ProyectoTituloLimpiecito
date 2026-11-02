import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import {
  SolicitudBodega, ProductoSolicitable, CentroPermitido, NuevaSolicitud, RespuestaBodega
} from '../../model/solicitud-bodega';

// SOLICITUDES DE BODEGA (RF-BOD-01) — /api/v1/bodega, formato { ok, data, meta }
@Injectable({
  providedIn: 'root'
})
export class SolicitudBodegaService {
  public url_bodega;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_bodega = environment.url + '/api/v1/bodega';
  }

  //CABECERA CON TOKEN (MISMO TOKEN DE SESION QUE EL RESTO DEL SISTEMA)
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //PRODUCTOS QUE SE PUEDEN PEDIR (SIN STOCK NI PRECIO)
  obtenerProductos(): Observable<RespuestaBodega<ProductoSolicitable[]>> {
    return this.http.get<RespuestaBodega<ProductoSolicitable[]>>(this.url_bodega + '/productos/solicitables', { headers: this.obtenerCabeceras() });
  }

  //CENTROS DE COSTO ABIERTOS PERMITIDOS
  obtenerCentros(): Observable<RespuestaBodega<CentroPermitido[]>> {
    return this.http.get<RespuestaBodega<CentroPermitido[]>>(this.url_bodega + '/centros-costo/permitidos', { headers: this.obtenerCabeceras() });
  }

  //LISTADO (ADMIN / OPERACIONES). estado acepta varios separados por coma
  listar(estado: string, page: number, limit: number): Observable<RespuestaBodega<SolicitudBodega[]>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (estado) { params = params.set('estado', estado); }
    return this.http.get<RespuestaBodega<SolicitudBodega[]>>(this.url_bodega + '/solicitudes', { headers: this.obtenerCabeceras(), params: params });
  }

  //DETALLE CON ITEMS Y ACCIONES PERMITIDAS (meta.acciones)
  obtener(id: number): Observable<RespuestaBodega<SolicitudBodega>> {
    return this.http.get<RespuestaBodega<SolicitudBodega>>(this.url_bodega + '/solicitudes/' + id, { headers: this.obtenerCabeceras() });
  }

  //CREAR SOLICITUD
  crear(solicitud: NuevaSolicitud): Observable<RespuestaBodega<SolicitudBodega>> {
    return this.http.post<RespuestaBodega<SolicitudBodega>>(this.url_bodega + '/solicitudes', solicitud, { headers: this.obtenerCabeceras() });
  }

  //ANULAR (NO HAY BORRADO FISICO)
  anular(id: number, motivo: string): Observable<RespuestaBodega<SolicitudBodega>> {
    return this.http.patch<RespuestaBodega<SolicitudBodega>>(this.url_bodega + '/solicitudes/' + id + '/anular', { motivo: motivo }, { headers: this.obtenerCabeceras() });
  }
}
