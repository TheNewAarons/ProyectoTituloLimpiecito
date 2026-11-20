import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { OpcionSimple, OpcionesCliente, PlanAsignacion, RespuestaPev } from '../../model/pev-masiva';

// ASIGNACION MASIVA PEV (RF-PEV-01) — /api/v1/pev/asignaciones-masivas (solo Admin)
@Injectable({
  providedIn: 'root'
})
export class PevMasivaService {
  public url;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url = environment.url + '/api/v1/pev/asignaciones-masivas';
  }

  private opciones(params?: HttpParams) {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }), params: params };
  }

  clientes(): Observable<RespuestaPev<{ clientes: OpcionSimple[] }>> {
    return this.http.get<RespuestaPev<{ clientes: OpcionSimple[] }>>(this.url + '/opciones', this.opciones());
  }

  opcionesCliente(clienteId: number): Observable<RespuestaPev<OpcionesCliente>> {
    return this.http.get<RespuestaPev<OpcionesCliente>>(this.url + '/opciones', this.opciones(new HttpParams().set('cliente_id', String(clienteId))));
  }

  //VISTA PREVIA: NO GUARDA NADA
  vistaPrevia(cuerpo: object): Observable<RespuestaPev<PlanAsignacion>> {
    return this.http.post<RespuestaPev<PlanAsignacion>>(this.url + '/vista-previa', cuerpo, this.opciones());
  }

  //CONFIRMAR: TODO EN UNA TRANSACCION (SI UNA FILA FALLA, NO SE CREA NADA)
  confirmar(cuerpo: object): Observable<RespuestaPev<PlanAsignacion>> {
    return this.http.post<RespuestaPev<PlanAsignacion>>(this.url, cuerpo, this.opciones());
  }
}
