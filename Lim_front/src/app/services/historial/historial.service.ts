import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// RNF-SEC-02: un registro de la auditoría con el nombre de quien actuó (GET /api/v1/auditoria/historial).
export interface RegistroHistorial {
  id: number;
  entidad: string;
  entidad_id: string;
  accion: string;
  motivo: string | null;
  valores_antes: any;
  valores_despues: any;
  created_at: string;
  quien: { nombre: string; rol: string | null };
}

export interface RespuestaHistorial {
  ok: boolean;
  data: RegistroHistorial[];
  meta: { hay_mas: boolean; limite: number };
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  constructor(private http: HttpClient) {}

  // La sesión la agrega TokenSesionInterceptor.
  historial(entidad: string, entidadId: number | string): Observable<RespuestaHistorial> {
    const params = new HttpParams().set('entidad', entidad).set('entidad_id', String(entidadId));
    return this.http.get<RespuestaHistorial>(environment.url + '/api/v1/auditoria/historial', { params: params });
  }

  // Todo lo de una caja mensual: la caja y sus movimientos (centros, egresos, ingresos, liquidaciones, insumos).
  historialCaja(cajaId: number): Observable<RespuestaHistorial> {
    const params = new HttpParams().set('caja_id', String(cajaId));
    return this.http.get<RespuestaHistorial>(environment.url + '/api/v1/auditoria/historial-caja', { params: params });
  }
}
