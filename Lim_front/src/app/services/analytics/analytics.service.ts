import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import {
  DetalleRentabilidad, FiltrosAnalytics, FilaGastosGenerales, FilaRentabilidad, MetaAnalytics, MetaRentabilidad, PuntoTendencia,
  RespuestaAnalytics, ResumenFinanciero
} from '../../model/analytics';
import {
  AgruparConsumo, FilaConsumoGrupo, FilaConsumoMes, FilaFrecuenciaCompra, FilaStockCritico, FilaMerma, MetaMerma, FilaTopProducto, MetaConsumo
} from '../../model/analytics';
import { FiltrosProductividad, MetaProductividad } from '../../model/analytics';

type FilaRankingRentabilidad = FilaRentabilidad | FilaGastosGenerales;

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
  obtener<T, M = MetaAnalytics>(ruta: string, filtros: FiltrosAnalytics = {}): Observable<RespuestaAnalytics<T, M>> {
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
    return this.http.get<RespuestaAnalytics<T, M>>(this.url_analytics + ruta, { headers: this.obtenerCabeceras(), params: params });
  }

  //DASHBOARD FINANCIERO (RF-BI-01)
  resumenFinanciero(periodo?: string): Observable<RespuestaAnalytics<ResumenFinanciero>> {
    return this.obtener<ResumenFinanciero>('/financiero/resumen', { periodo: periodo });
  }

  tendenciaFinanciera(desde?: string, hasta?: string): Observable<RespuestaAnalytics<PuntoTendencia[]>> {
    return this.obtener<PuntoTendencia[]>('/financiero/tendencia', { desde: desde, hasta: hasta });
  }

  // RENTABILIDAD POR CLIENTE / CENTRO DE COSTO (RF-BI-02)
  rentabilidad(desde?: string, hasta?: string): Observable<RespuestaAnalytics<FilaRankingRentabilidad[], MetaRentabilidad>> {
    return this.obtener<FilaRankingRentabilidad[], MetaRentabilidad>('/rentabilidad', { desde: desde, hasta: hasta });
  }

  rentabilidadDetalle(centroCostoId: number, desde?: string, hasta?: string): Observable<RespuestaAnalytics<DetalleRentabilidad>> {
    return this.obtener<DetalleRentabilidad>('/rentabilidad/' + centroCostoId + '/detalle', { desde: desde, hasta: hasta });
  }

  // CONSUMO DE BODEGA (RF-BI-03). Parámetros propios (agrupar, producto_id, limite) que obtener() no conoce.
  private obtenerBodega<T, M = MetaAnalytics>(ruta: string, query: { [clave: string]: string | number | null | undefined }): Observable<RespuestaAnalytics<T, M>> {
    let params = new HttpParams();
    Object.keys(query).forEach((clave: string) => {
      const valor = query[clave];
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    });
    return this.http.get<RespuestaAnalytics<T, M>>(this.url_analytics + '/bodega' + ruta, { headers: this.obtenerCabeceras(), params: params });
  }

  topProductosBodega(desde: string, hasta: string, limite?: number): Observable<RespuestaAnalytics<FilaTopProducto[]>> {
    return this.obtenerBodega<FilaTopProducto[]>('/top-productos', { desde: desde, hasta: hasta, limite: limite });
  }

  consumoBodega<T = FilaConsumoMes[] | FilaConsumoGrupo[]>(agrupar: AgruparConsumo, desde: string, hasta: string, productoId?: number | null): Observable<RespuestaAnalytics<T, MetaConsumo>> {
    return this.obtenerBodega<T, MetaConsumo>('/consumo', { agrupar: agrupar, desde: desde, hasta: hasta, producto_id: productoId });
  }

  frecuenciaCompraBodega(desde: string, hasta: string): Observable<RespuestaAnalytics<FilaFrecuenciaCompra[]>> {
    return this.obtenerBodega<FilaFrecuenciaCompra[]>('/frecuencia-compra', { desde: desde, hasta: hasta });
  }

  mermaBodega(desde: string, hasta: string): Observable<RespuestaAnalytics<FilaMerma[], MetaMerma>> {
    return this.obtenerBodega<FilaMerma[], MetaMerma>('/merma', { desde: desde, hasta: hasta });
  }

  stockCriticoBodega(): Observable<RespuestaAnalytics<FilaStockCritico[]>> {
    return this.obtenerBodega<FilaStockCritico[]>('/stock-critico', {});
  }

  // PRODUCTIVIDAD PEV (RF-BI-04). vista: 'trabajadores' | 'supervisores' | 'sectores'
  productividad<T>(vista: string, f: FiltrosProductividad): Observable<RespuestaAnalytics<T, MetaProductividad>> {
    let params = new HttpParams().set('desde', f.desde).set('hasta', f.hasta);
    if (f.clienteId) params = params.set('cliente_id', String(f.clienteId));
    if (f.supervisor) params = params.set('supervisor', String(f.supervisor));
    return this.http.get<RespuestaAnalytics<T, MetaProductividad>>(this.url_analytics + '/productividad/' + vista, { headers: this.obtenerCabeceras(), params: params });
  }
}
