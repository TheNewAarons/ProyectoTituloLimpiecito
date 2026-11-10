import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { RespuestaBodega, SolicitudBodega } from '../../model/solicitud-bodega';
import { OrdenResumen, OrdenRecepcion, ResultadoRecepcion, FormatoEntrega, MovimientoBodega } from '../../model/recepcion-bodega';

// RECEPCIÓN, ENTREGA Y MOVIMIENTOS DE BODEGA (RF-BOD-04) — /api/v1/bodega, formato { ok, data, meta }
@Injectable({
  providedIn: 'root'
})
export class RecepcionBodegaService {
  public url_bodega;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_bodega = environment.url + '/api/v1/bodega';
  }

  //CABECERA CON TOKEN (MISMO TOKEN DE SESION QUE EL RESTO DEL SISTEMA)
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //ORDENES DE COMPRA (estado acepta varios separados por coma)
  listarOrdenes(estado: string, page: number, limit: number): Observable<RespuestaBodega<OrdenResumen[]>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (estado) { params = params.set('estado', estado); }
    return this.http.get<RespuestaBodega<OrdenResumen[]>>(this.url_bodega + '/ordenes-compra', { headers: this.obtenerCabeceras(), params: params });
  }

  //DETALLE DE LA ORDEN PARA RECIBIR (LINEAS CON PENDIENTE)
  detalleRecepcion(id: number): Observable<RespuestaBodega<OrdenRecepcion>> {
    return this.http.get<RespuestaBodega<OrdenRecepcion>>(this.url_bodega + '/ordenes-compra/' + id + '/recepcion', { headers: this.obtenerCabeceras() });
  }

  //CONFIRMAR RECEPCION POR LINEA
  recibir(id: number, items: { item_id: number, cantidad_recibida: number }[]): Observable<RespuestaBodega<ResultadoRecepcion>> {
    return this.http.post<RespuestaBodega<ResultadoRecepcion>>(this.url_bodega + '/ordenes-compra/' + id + '/recepcion', { items: items }, { headers: this.obtenerCabeceras() });
  }

  //ENTREGAR SOLICITUD (NO MUEVE STOCK; REGISTRA CONSUMO EN EL CENTRO DE COSTO)
  entregar(id: number): Observable<RespuestaBodega<SolicitudBodega>> {
    return this.http.post<RespuestaBodega<SolicitudBodega>>(this.url_bodega + '/solicitudes/' + id + '/entregar', {}, { headers: this.obtenerCabeceras() });
  }

  //DATOS DEL FORMATO DE ENTREGA IMPRIMIBLE
  formatoEntrega(id: number): Observable<RespuestaBodega<FormatoEntrega>> {
    return this.http.get<RespuestaBodega<FormatoEntrega>>(this.url_bodega + '/solicitudes/' + id + '/formato-entrega', { headers: this.obtenerCabeceras() });
  }

  //MOVIMIENTOS DE BODEGA CON FILTROS (desde/hasta 'YYYY-MM-DD')
  movimientos(filtros: { producto_id?: number, tipo?: string, desde?: string, hasta?: string, page: number, limit: number }): Observable<RespuestaBodega<MovimientoBodega[]>> {
    let params = new HttpParams().set('page', String(filtros.page)).set('limit', String(filtros.limit));
    if (filtros.producto_id) { params = params.set('producto_id', String(filtros.producto_id)); }
    if (filtros.tipo) { params = params.set('tipo', filtros.tipo); }
    if (filtros.desde) { params = params.set('desde', filtros.desde); }
    if (filtros.hasta) { params = params.set('hasta', filtros.hasta); }
    return this.http.get<RespuestaBodega<MovimientoBodega[]>>(this.url_bodega + '/movimientos', { headers: this.obtenerCabeceras(), params: params });
  }
}
