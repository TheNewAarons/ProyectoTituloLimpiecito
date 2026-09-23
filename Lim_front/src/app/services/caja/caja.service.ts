import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url;
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
  //CERRAR CAJA
  cerrarCaja(fecha, id) {
    return this.http.put(this.url_backend + '/caja/cerrar/' + id, { fecha });
  }
  //OBTENER CAJA ACTIVA
  obtenerCajaActiva() {
    return this.http.get(this.url_backend + '/caja/obtener-activa');
  }
  //OBTENER CAJA POR ID
  obtenerCajaId(id) {
    return this.http.get(this.url_backend + '/caja/obtener-unico/' + id);
  }
}
