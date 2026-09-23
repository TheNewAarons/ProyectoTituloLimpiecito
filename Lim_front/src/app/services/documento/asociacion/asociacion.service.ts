import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AsociacionService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/asociacion';
  }

  //CREAR ASOCIACION DOCUMENTO - TRABAJADOR
  crearDocTra(asoc_trabajadores) {
    let asoc_trabajadores_json = JSON.stringify(asoc_trabajadores);
    return this.http.post(this.url_backend + '/crear-asoc-trabajador', { asoc_trabajadores: asoc_trabajadores_json });
  }

  //OBTENER TODOS ASOCIACIONES DOCUMENTO - TRABAJADOR POR ID DOCUMENTO, USA PARA SACAR LOS EXISTENTES
  obtenerAsocDocTraIdDocumento(id) {
    return this.http.get(this.url_backend + '/obtener-asoc-tra/' + id);
  }

  //OBTENER ASOCIACION CLIENTE EN VER DOCUMENTO
  obtenerAsocTrabajador(idDocumento) {
    return this.http.get(this.url_backend + '/get-asoc-tra/' + idDocumento);
  }

  // ELIMINAR ASOCIACIONE DOCUMENTO - TRABAJADOR
  eliminarAsocDocTra(idAsoc) {
    return this.http.delete(this.url_backend + '/eliminar-asoc-trabajador/' + idAsoc);
  }
}
