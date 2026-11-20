import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { FiltrosAnalytics, PuntoTendencia, RespuestaAnalytics, ResumenFinanciero } from '../../model/analytics';

// ANALYTICS (RF-BI-01a) — /api/v1/analytics, formato { ok, data, meta }. Cada BI-0x agrega su método tipado sobre obtener<T>().
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  public url_analytics: string;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_analytics = environment.url + '/api/v1/analytics';
  }

  //CABECERA CON TOKEN (MISMO TOKEN DE SESION QUE EL RESTO DEL SISTEMA)
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //GET GENERICO; OMITE FILTROS VACIOS. Sin catchError: el componente decide (403/500)
  obtener<T>(ruta: string, filtros: FiltrosAnalytics = {}): Observable<RespuestaAnalytics<T>> {
    const query: { [clave: string]: string | number | null | undefined } = {
      desde: filtros.desde,
      hasta: filtros.hasta,
      periodo: filtros.periodo,
      centro_costo_id: filtros.centroCostoId,
      cliente_id: filtros.clienteId
    };
    let params = new HttpParams();
    Object.keys(query).forEach((clave: string) => {
      const valor = query[clave];
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    });
    return this.http.get<RespuestaAnalytics<T>>(this.url_analytics + ruta, { headers: this.obtenerCabeceras(), params: params });
  }

  //DASHBOARD FINANCIERO (RF-BI-01)
  resumenFinanciero(periodo?: string): Observable<RespuestaAnalytics<ResumenFinanciero>> {
    return this.obtener<ResumenFinanciero>('/financiero/resumen', { periodo: periodo });
  }

  tendenciaFinanciera(desde?: string, hasta?: string): Observable<RespuestaAnalytics<PuntoTendencia[]>> {
    return this.obtener<PuntoTendencia[]>('/financiero/tendencia', { desde: desde, hasta: hasta });
  }
}
