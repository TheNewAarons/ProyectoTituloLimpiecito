import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'
import { LoginService } from '../login/login.service';
import { ApiOkResponse } from '../../model/liquidacion-pago';
import { ResumenFacturas } from '../../model/factura-pago';
import { Egreso } from '../../model/egreso';


@Injectable({
  providedIn: 'root'
})
export class EgresoService {

  public url_backend;
  public url_backend_v1;

  constructor(private http:HttpClient, private loginService: LoginService) {
    this.url_backend = environment.url
    this.url_backend_v1 = environment.url + '/api/v1';
  }

  //CABECERA CON TOKEN PARA LOS ENDPOINTS /api/v1
  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  //CREAR EGRESO
  crearEgreso(egreso){
    let egreso_json = JSON.stringify(egreso);
    return this.http.post(this.url_backend+"/egreso/crear",{ egreso: egreso_json});
  } 

  //ELIMINAR EGRESO
  eliminarEgreso(id){
    return this.http.delete(this.url_backend+"/egreso/eliminar/"+id);
  }

  //OBTENER EGRESOS
  obtenerEgresos(){
    return this.http.get(this.url_backend+"/egreso/obtener");
  }

  //OBTENER EGRESOS POR CAJA
  obtenerEgresosCaja(id){
    return this.http.get(this.url_backend+"/egreso/obtener-caja/"+id);
  }

  /** ========= RF-FAC-01: Estado de pago de egresos (/api/v1) ========= */

  //MARCAR UN EGRESO (FACTURA) COMO PAGADO
  marcarComoPagado(id: number, fechaPago: string): Observable<ApiOkResponse<Egreso>> {
    return this.http.patch<ApiOkResponse<Egreso>>(
      this.url_backend_v1 + '/egresos/' + id + '/pagar',
      { fecha_pago: fechaPago },
      { headers: this.obtenerCabeceras() }
    );
  }

  //ANULAR UN EGRESO (REEMPLAZA ELIMINAR PARA FACTURAS): NUNCA SE BORRA EL REGISTRO
  anularEgreso(id: number, motivo: string): Observable<ApiOkResponse<Egreso>> {
    return this.http.patch<ApiOkResponse<Egreso>>(
      this.url_backend_v1 + '/egresos/' + id + '/anular',
      { motivo },
      { headers: this.obtenerCabeceras() }
    );
  }

  //REVERTIR EL PAGO DE UN EGRESO (SOLO ADMIN)
  revertirPagoEgreso(id: number, motivo: string): Observable<ApiOkResponse<Egreso>> {
    return this.http.patch<ApiOkResponse<Egreso>>(
      this.url_backend_v1 + '/egresos/' + id + '/revertir',
      { motivo },
      { headers: this.obtenerCabeceras() }
    );
  }

  //RESUMEN DE FACTURAS POR COBRAR/POR PAGAR (INFORMATIVO, FUERA DEL SALDO DE CAJA)
  obtenerResumenFacturas(periodo?: string): Observable<ApiOkResponse<ResumenFacturas>> {
    let url = this.url_backend_v1 + '/facturas/resumen';
    if (periodo) {
      url += '?periodo=' + encodeURIComponent(periodo);
    }
    return this.http.get<ApiOkResponse<ResumenFacturas>>(url, { headers: this.obtenerCabeceras() });
  }
}
