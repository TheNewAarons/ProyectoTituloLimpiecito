import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginService } from '../login/login.service';
import { DocumentoArchivo, RespuestaArchivo } from '../../model/documento-publico';

// DOCUMENTOS PUBLICOS (RF-WEB-02) — PATCH /api/v1/archivos/:id/publicar, formato { ok, data, meta }
@Injectable({
  providedIn: 'root'
})
export class DocumentoPublicoService {
  public url_archivos: string;

  constructor(private http: HttpClient, private loginService: LoginService) {
    this.url_archivos = environment.url + '/api/v1/archivos';
  }

  private obtenerCabeceras(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.loginService.getToken() || '' });
  }

  publicar(id: number, publico: boolean): Observable<RespuestaArchivo<DocumentoArchivo>> {
    return this.http.patch<RespuestaArchivo<DocumentoArchivo>>(
      this.url_archivos + '/' + id + '/publicar',
      { publico: publico },
      { headers: this.obtenerCabeceras() }
    );
  }
}
