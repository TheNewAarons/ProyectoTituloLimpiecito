import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment'
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DescargaService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url;
  }
  //CREAR DESCARGA CLIENTE
  crearDesCliente(desc_cliente) {
    let desc_cliente_json = JSON.stringify(desc_cliente);
    return this.http.post(this.url_backend + '/crear-desc-cliente', { desc_cliente: desc_cliente_json });
  }

  //CREAR DESCARGA TRABAJADOR
  crearDesTrabajador(desc_trabajador) {
    let desc_trabajador_json = JSON.stringify(desc_trabajador);
    return this.http.post(this.url_backend + '/crear-desc-trabajador', { desc_trabajador: desc_trabajador_json });
  }
  //OBTENER DESCARGAS CLIENTES
  obtenerDesClientes() {
    return this.http.get(this.url_backend + '/obtener-desc-cliente');
  }

  //OBTENER DESCARGAS TRABAJADORES
  obtenerDesTrabajadores() {
    return this.http.get(this.url_backend + '/obtener-desc-trabajador');
  }

  //VER DETALLE DOCUMENTO
  detalleDesDoc(idDocumento) {
    return this.http.get(this.url_backend + '/detalle-desc/' + idDocumento);
  }
}
