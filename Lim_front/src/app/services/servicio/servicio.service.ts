import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ServicioService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/servicio';
  }

  //CREAR SERVICIO
  crearServicio(servicio) {
    return this.http.post(this.url_backend + '/crear', servicio);
  }
  //EDITAR SERVICIO
  editarServicio(servicio, idServicio) {
    return this.http.put(this.url_backend + '/editar/' + idServicio, servicio);
  }

  //OBTENER SERVICIOS ACTIVOS
  obtenerServiciosActivos() {
    return this.http.get(this.url_backend + '/obtener-servicios-activos');
  }
  //OTENER SERVICIOS INACTIVOS
  obtenerServiciosInactivos() {
    return this.http.get(this.url_backend + '/obtener-servicios-inactivos');
  }
  //OBTENER SERVICIO POR ID
  obtenerServicio(idServicio) {
    return this.http.get(this.url_backend + '/obtener-servicio/' + idServicio);
  }

  //DESACTIVAR SERVICIO
  desactivarServicio(idServicio) {
    return this.http.delete(this.url_backend + '/desactivar-servicio/' + idServicio);
  }
  //ACTIVAR SERVICIO
  activarServicio(idServicio) {
    return this.http.delete(this.url_backend + '/activar-servicio/' + idServicio);
  }
}
