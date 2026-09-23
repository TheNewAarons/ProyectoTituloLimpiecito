import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ObservacionService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/observacion';
  }

  //CREAR OBSERVACION
  crearObservacion(observacion) {
    return this.http.post(this.url_backend + '/crear', { observacion });
  }

  //EDITAR OBSERVACION
  editarObservacion(idObservacion, observacion) {}
}
