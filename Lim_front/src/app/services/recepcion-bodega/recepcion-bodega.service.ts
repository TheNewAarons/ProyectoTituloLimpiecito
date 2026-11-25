import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { RespuestaBodega, SolicitudBodega } from '../../model/solicitud-bodega';
import {
  OrdenResumen, OrdenRecepcion, ResultadoRecepcion, DocumentoRecepcion, FormatoEntrega, MovimientoBodega, KardexProducto,
  ConteoResumen, ConteoDetalle, ResultadoAprobacionConteo, Proveedor, DatosProveedor, ResultadoGenerarOrdenes
} from '../../model/recepcion-bodega';

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

  //GENERAR OC BORRADOR DESDE LA LISTA DE COMPRA (RF-BOD-03)
  generarOrdenes(): Observable<RespuestaBodega<ResultadoGenerarOrdenes>> {
    return this.http.post<RespuestaBodega<ResultadoGenerarOrdenes>>(this.url_bodega + '/ordenes-compra/desde-lista', {}, { headers: this.obtenerCabeceras() });
  }

  //EDITAR OC EN BORRADOR: AJUSTAR CANTIDADES Y QUITAR ITEMS (RF-BOD-03)
  actualizarOrden(id: number, cambios: { items: { id: number, cantidad: number }[], eliminar: number[] }): Observable<RespuestaBodega<{ id: number, estado: string }>> {
    return this.http.patch<RespuestaBodega<{ id: number, estado: string }>>(this.url_bodega + '/ordenes-compra/' + id, cambios, { headers: this.obtenerCabeceras() });
  }

  //ENVIAR OC AL PROVEEDOR POR CORREO (RF-BOD-03)
  enviarOrden(id: number): Observable<RespuestaBodega<{ id: number, estado: string }>> {
    return this.http.post<RespuestaBodega<{ id: number, estado: string }>>(this.url_bodega + '/ordenes-compra/' + id + '/enviar', {}, { headers: this.obtenerCabeceras() });
  }

  //DETALLE DE LA ORDEN PARA RECIBIR (LINEAS CON PENDIENTE)
  detalleRecepcion(id: number): Observable<RespuestaBodega<OrdenRecepcion>> {
    return this.http.get<RespuestaBodega<OrdenRecepcion>>(this.url_bodega + '/ordenes-compra/' + id + '/recepcion', { headers: this.obtenerCabeceras() });
  }

  //CONFIRMAR RECEPCION POR LINEA
  recibir(
    id: number, items: { item_id: number, cantidad_recibida: number, costo_unitario?: number }[], documento: DocumentoRecepcion
  ): Observable<RespuestaBodega<ResultadoRecepcion>> {
    const body = Object.assign({ items: items }, documento);
    return this.http.post<RespuestaBodega<ResultadoRecepcion>>(this.url_bodega + '/ordenes-compra/' + id + '/recepcion', body, { headers: this.obtenerCabeceras() });
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

  //KARDEX VALORIZADO DE UN PRODUCTO (RF-BOD-06)
  kardex(productoId: number, page: number, limit: number): Observable<RespuestaBodega<KardexProducto>> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<RespuestaBodega<KardexProducto>>(this.url_bodega + '/productos/' + productoId + '/kardex', { headers: this.obtenerCabeceras(), params: params });
  }

  //CONTEOS FISICOS (RF-BOD-07)
  listarConteos(estado: string, page: number, limit: number): Observable<RespuestaBodega<ConteoResumen[]>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (estado) { params = params.set('estado', estado); }
    return this.http.get<RespuestaBodega<ConteoResumen[]>>(this.url_bodega + '/conteos', { headers: this.obtenerCabeceras(), params: params });
  }

  //SIN producto_ids SE CUENTAN TODOS LOS PRODUCTOS ACTIVOS
  crearConteo(observacion: string): Observable<RespuestaBodega<ConteoResumen>> {
    return this.http.post<RespuestaBodega<ConteoResumen>>(this.url_bodega + '/conteos', { observacion: observacion }, { headers: this.obtenerCabeceras() });
  }

  obtenerConteo(id: number): Observable<RespuestaBodega<ConteoDetalle>> {
    return this.http.get<RespuestaBodega<ConteoDetalle>>(this.url_bodega + '/conteos/' + id, { headers: this.obtenerCabeceras() });
  }

  //cantidad_contada null LIMPIA LA LINEA
  capturarConteo(id: number, items: { item_id: number, cantidad_contada: number, motivo: string }[]): Observable<RespuestaBodega<ConteoDetalle>> {
    return this.http.patch<RespuestaBodega<ConteoDetalle>>(this.url_bodega + '/conteos/' + id + '/items', { items: items }, { headers: this.obtenerCabeceras() });
  }

  anularConteo(id: number, motivo: string): Observable<RespuestaBodega<ConteoDetalle>> {
    return this.http.patch<RespuestaBodega<ConteoDetalle>>(this.url_bodega + '/conteos/' + id + '/anular', { motivo: motivo }, { headers: this.obtenerCabeceras() });
  }

  //SOLO ADMINISTRADOR: GENERA LOS AJUSTES EN EL KARDEX
  aprobarConteo(id: number): Observable<RespuestaBodega<ResultadoAprobacionConteo>> {
    return this.http.post<RespuestaBodega<ResultadoAprobacionConteo>>(this.url_bodega + '/conteos/' + id + '/aprobar', {}, { headers: this.obtenerCabeceras() });
  }

  //PROVEEDORES (RF-BOD-03). activo: 1 activos, 0 inactivos, null todos. El backend acepta limite <= 100
  listarProveedores(activo: number, pagina: number, limite: number): Observable<RespuestaBodega<Proveedor[]>> {
    let params = new HttpParams().set('pagina', String(pagina)).set('limite', String(limite));
    if (activo === 0 || activo === 1) { params = params.set('activo', String(activo)); }
    return this.http.get<RespuestaBodega<Proveedor[]>>(this.url_bodega + '/proveedores', { headers: this.obtenerCabeceras(), params: params });
  }

  crearProveedor(datos: DatosProveedor): Observable<RespuestaBodega<Proveedor>> {
    return this.http.post<RespuestaBodega<Proveedor>>(this.url_bodega + '/proveedores', datos, { headers: this.obtenerCabeceras() });
  }

  editarProveedor(id: number, datos: DatosProveedor): Observable<RespuestaBodega<Proveedor>> {
    return this.http.patch<RespuestaBodega<Proveedor>>(this.url_bodega + '/proveedores/' + id, datos, { headers: this.obtenerCabeceras() });
  }

  //BAJA LOGICA (activo = 0); NO SE BORRA
  desactivarProveedor(id: number): Observable<RespuestaBodega<Proveedor>> {
    return this.http.delete<RespuestaBodega<Proveedor>>(this.url_bodega + '/proveedores/' + id, { headers: this.obtenerCabeceras() });
  }

  reactivarProveedor(id: number): Observable<RespuestaBodega<Proveedor>> {
    return this.http.patch<RespuestaBodega<Proveedor>>(this.url_bodega + '/proveedores/' + id + '/reactivar', {}, { headers: this.obtenerCabeceras() });
  }
}
