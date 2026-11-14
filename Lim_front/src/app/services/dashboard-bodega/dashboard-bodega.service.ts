import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { RespuestaBodega } from '../../model/solicitud-bodega';
import { DashboardBodega, ProductoStock } from '../../model/dashboard-bodega';

// DASHBOARD DE BODEGA (RF-BOD-05) — /api/v1/bodega, formato { ok, data, meta }
@Injectable({
  providedIn: 'root'
})
export class DashboardBodegaService {
  public url_bodega;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_bodega = environment.url + '/api/v1/bodega';
  }

  //CABECERA CON TOKEN (MISMO TOKEN DE SESION QUE EL RESTO DEL SISTEMA)
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //LOS 4 BLOQUES EN UNA LLAMADA
  obtener(): Observable<RespuestaBodega<DashboardBodega>> {
    return this.http.get<RespuestaBodega<DashboardBodega>>(this.url_bodega + '/dashboard', { headers: this.obtenerCabeceras() });
  }

  //STOCK MINIMO (ENTERO >= 0; 0 = SIN ALERTA)
  actualizarStockMinimo(id: number, stockMinimo: number): Observable<RespuestaBodega<ProductoStock>> {
    return this.http.patch<RespuestaBodega<ProductoStock>>(this.url_bodega + '/productos/' + id + '/stock-minimo', { stock_minimo: stockMinimo }, { headers: this.obtenerCabeceras() });
  }
}
