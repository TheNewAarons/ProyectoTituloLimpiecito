import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';
import {
  ApiOkResponse,
  EstadoPagoLiquidacion,
  LiquidacionPago,
  ResumenPendientesPago
} from '../../model/liquidacion-pago';

@Injectable({
  providedIn: 'root'
})
export class LiquidacionService {

  public url_backend;
  public url_backend_v1;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_backend = environment.url;
    this.url_backend_v1 = environment.url + '/api/v1';
   }

  //CABECERA CON TOKEN PARA LOS ENDPOINTS /api/v1
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //CREAR LIQUIDACION
  crearLiquidacion(liquidacion,id){
    let liquidacion_json = JSON.stringify(liquidacion);
    return this.http.post(this.url_backend+"/liquidacion/crear/"+id,{ liquidacion: liquidacion_json});
  }

  //EDITAR LIQUIDACION
  editarLiquidacion(id,liquidacion){
    let liquidacion_json = JSON.stringify(liquidacion);
    return this.http.put(this.url_backend+"/liquidacion/editar/"+id,{liquidacion:liquidacion_json});
  }
  //OBTENER LIQUIDACION POR ID 
  obtenerLiquidacionId(id){
    return  this.http.get(this.url_backend+"/liquidacion/obtener/"+id);
  }
  //CERRAR LIQUIDACION
  cerrarLiquidacion(id){
    return this.http.delete(this.url_backend+"/liquidacion/cerrar/"+id);
  }

  //OBTENER TODAS LAS LIQUIDACIONES
  obtenerLiquidaciones(){
    return this.http.get(this.url_backend+"/liquidacion/obtener-todos");
  }

  obtenerBusqueda(busca){
    return  this.http.get(this.url_backend+"/liquidacion/obtener-busca/"+busca);
  }

  /** ========= RF-CAJA-02: Estado de pago de liquidaciones (/api/v1) ========= */

  //OBTENER LIQUIDACIONES FILTRADAS POR PERIODO Y ESTADO DE PAGO
  obtenerLiquidacionesPago(periodo?: string, estadoPago?: EstadoPagoLiquidacion): Observable<ApiOkResponse<LiquidacionPago[]>> {
    let url = this.url_backend_v1 + '/liquidaciones';
    const parametros: string[] = [];
    if (periodo) {
      parametros.push('periodo=' + encodeURIComponent(periodo));
    }
    if (estadoPago) {
      parametros.push('estado_pago=' + encodeURIComponent(estadoPago));
    }
    if (parametros.length > 0) {
      url += '?' + parametros.join('&');
    }
    return this.http.get<ApiOkResponse<LiquidacionPago[]>>(url, { headers: this.obtenerCabeceras() });
  }

  //MARCAR UNA LIQUIDACION COMO PAGADA
  marcarComoPagada(id: number, fechaPago: string): Observable<ApiOkResponse<LiquidacionPago>> {
    return this.http.patch<ApiOkResponse<LiquidacionPago>>(
      this.url_backend_v1 + '/liquidaciones/' + id + '/pagar',
      { fecha_pago: fechaPago },
      { headers: this.obtenerCabeceras() }
    );
  }

  //PAGAR LIQUIDACIONES EN LOTE
  pagarLote(ids: number[], fechaPago: string): Observable<ApiOkResponse<LiquidacionPago[]>> {
    return this.http.post<ApiOkResponse<LiquidacionPago[]>>(
      this.url_backend_v1 + '/liquidaciones/pagar-lote',
      { ids, fecha_pago: fechaPago },
      { headers: this.obtenerCabeceras() }
    );
  }

  //REVERTIR EL PAGO DE UNA LIQUIDACION (SOLO ADMIN)
  revertirPago(id: number, motivo: string): Observable<ApiOkResponse<LiquidacionPago>> {
    return this.http.patch<ApiOkResponse<LiquidacionPago>>(
      this.url_backend_v1 + '/liquidaciones/' + id + '/revertir-pago',
      { motivo },
      { headers: this.obtenerCabeceras() }
    );
  }

  //OBTENER RESUMEN DE LIQUIDACIONES PENDIENTES DE PAGO PARA UN PERIODO
  obtenerResumenPendientesPago(periodo?: string): Observable<ApiOkResponse<ResumenPendientesPago>> {
    let url = this.url_backend_v1 + '/liquidaciones/pendientes-resumen';
    if (periodo) {
      url += '?periodo=' + encodeURIComponent(periodo);
    }
    return this.http.get<ApiOkResponse<ResumenPendientesPago>>(url, { headers: this.obtenerCabeceras() });
  }


}
