import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';
import { ApiOkResponse } from '../../model/liquidacion-pago';
import { CajaResumen, CajaHistorialItem, CajaCierreResultado, CajaReaperturaResultado } from '../../model/caja-resumen';

@Injectable({
  providedIn: 'root'
})
export class CajaService {
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

  //CREAR CAJA
  crearCaja(caja) {
    let caja_json = JSON.stringify(caja);
    return this.http.post(this.url_backend + '/caja/crear', {
      caja: caja_json
    });
  }
  //OBTENER CAJAS CON DETALLES
  obtenerCajas() {
    return this.http.get(this.url_backend + '/caja/obtener');
  }
  //OBTENER CAJAS CON DETALLES
  obtenerSoloCajas() {
    return this.http.get(this.url_backend + '/caja/obtener-cajas');
  }
  //CERRAR CAJA (RUTA LEGACY, EXIGE x-access-token DE ADMIN)
  cerrarCaja(fecha, id) {
    return this.http.put(this.url_backend + '/caja/cerrar/' + id, { fecha }, { headers: this.obtenerCabeceras() });
  }
  //OBTENER CAJA ACTIVA
  obtenerCajaActiva() {
    return this.http.get(this.url_backend + '/caja/obtener-activa');
  }
  //OBTENER CAJA POR ID
  obtenerCajaId(id) {
    return this.http.get(this.url_backend + '/caja/obtener-unico/' + id);
  }

  /** ========= RF-CAJA-01: Saldo encadenado por periodo (/api/v1) ========= */

  //OBTENER EL RESUMEN DE SALDOS DE UN PERIODO (YYYY-MM)
  obtenerResumenPeriodo(periodo: string): Observable<ApiOkResponse<CajaResumen>> {
    return this.http.get<ApiOkResponse<CajaResumen>>(
      this.url_backend_v1 + '/cajas/' + periodo + '/resumen',
      { headers: this.obtenerCabeceras() }
    );
  }

  //CERRAR EL MES DE UN PERIODO (SOLO ADMIN)
  cerrarMes(periodo: string): Observable<ApiOkResponse<CajaCierreResultado>> {
    return this.http.post<ApiOkResponse<CajaCierreResultado>>(
      this.url_backend_v1 + '/cajas/' + periodo + '/cerrar',
      {},
      { headers: this.obtenerCabeceras() }
    );
  }

  //REABRIR EL MES DE UN PERIODO CON MOTIVO OBLIGATORIO (SOLO ADMIN)
  reabrirMes(periodo: string, motivo: string): Observable<ApiOkResponse<CajaReaperturaResultado>> {
    return this.http.post<ApiOkResponse<CajaReaperturaResultado>>(
      this.url_backend_v1 + '/cajas/' + periodo + '/reabrir',
      { motivo },
      { headers: this.obtenerCabeceras() }
    );
  }

  //OBTENER EL HISTORIAL DE SALDOS POR RANGO DE PERIODOS (YYYY-MM)
  obtenerHistorial(desde?: string, hasta?: string): Observable<ApiOkResponse<CajaHistorialItem[]>> {
    let url = this.url_backend_v1 + '/cajas/historial';
    const parametros: string[] = [];
    if (desde) {
      parametros.push('desde=' + encodeURIComponent(desde));
    }
    if (hasta) {
      parametros.push('hasta=' + encodeURIComponent(hasta));
    }
    if (parametros.length > 0) {
      url += '?' + parametros.join('&');
    }
    return this.http.get<ApiOkResponse<CajaHistorialItem[]>>(url, { headers: this.obtenerCabeceras() });
  }
}
