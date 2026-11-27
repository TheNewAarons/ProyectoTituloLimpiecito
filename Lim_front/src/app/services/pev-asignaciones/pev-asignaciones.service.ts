import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { RespuestaPev } from '../../model/pev-masiva';
import { AsignacionPev, AsignacionCronograma, LineaCumplimiento } from '../../model/pev-asignaciones';

// RF-PEV-02 (AUT-016, obs. 12) — asignaciones de una actividad y de un cronograma (/api/v1/pev, solo Admin).
@Injectable({
  providedIn: 'root'
})
export class PevAsignacionesService {
  private url = environment.url + '/api/v1/pev';

  constructor(private http: HttpClient, private loginService: LoginService) {}

  private opciones(params?: HttpParams) {
    return { headers: new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' }), params: params };
  }

  // Asignaciones de una actividad (activas, cerradas y anuladas), más recientes primero.
  deActividad(actividadId: number): Observable<RespuestaPev<AsignacionPev[]>> {
    const p = new HttpParams().set('actividad_id', String(actividadId)).set('limit', '100');
    return this.http.get<RespuestaPev<AsignacionPev[]>>(this.url + '/asignaciones', this.opciones(p));
  }

  // "Anular" = la asignación fue un error (motivo 5–500 caracteres; el backend la rechaza si ya tiene historial).
  anular(asignacionId: number, motivo: string): Observable<RespuestaPev<AsignacionPev>> {
    return this.http.patch<RespuestaPev<AsignacionPev>>(this.url + '/asignaciones/' + asignacionId + '/anular', { motivo: motivo }, this.opciones());
  }

  // "Quitar" = cerrar con fecha de término (no se borra; el historial se conserva).
  cerrar(asignacionId: number, fechaHasta: string): Observable<RespuestaPev<AsignacionPev>> {
    return this.http.patch<RespuestaPev<AsignacionPev>>(this.url + '/asignaciones/' + asignacionId + '/cerrar', { fecha_hasta: fechaHasta }, this.opciones());
  }

  cumplimiento(asignacionId: number): Observable<RespuestaPev<LineaCumplimiento[]>> {
    return this.http.get<RespuestaPev<LineaCumplimiento[]>>(this.url + '/asignaciones/' + asignacionId + '/cumplimiento',
      this.opciones(new HttpParams().set('limit', '100')));
  }

  deCronograma(cronogramaId: number): Observable<RespuestaPev<AsignacionCronograma[]>> {
    return this.http.get<RespuestaPev<AsignacionCronograma[]>>(this.url + '/cronogramas/' + cronogramaId + '/asignaciones', this.opciones());
  }
}
