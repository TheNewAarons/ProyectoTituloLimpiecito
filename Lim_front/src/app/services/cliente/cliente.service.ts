import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url;
  }

  //CREAR CLIENTE
  crearCliente(cliente) {
    let cliente_json = JSON.stringify(cliente);

    return this.http.post(this.url_backend + '/cliente/crear', { cliente: cliente_json });
  }

  //EDITAR CLIENTE
  editarCliente(cliente_edit, id) {
    let cliente_json = JSON.stringify(cliente_edit);

    return this.http.put(this.url_backend + '/cliente/editar/' + id, { cliente: cliente_json });
  }
  //OBTENER CLIENTES ACTIVOS
  obtenerClientesActivos() {
    return this.http.get(this.url_backend + '/cliente/ver-activo');
  }

  //OBTENER CLIENTES INACTIVOS
  obtenerClientesInactivos() {
    return this.http.get(this.url_backend + '/cliente/ver-inactivo');
  }
  //OBTENER CLIENTE
  obtenerCliente(id) {
    return this.http.get(this.url_backend + '/cliente/obtener-cliente/' + id);
  }
  //ELIMINAR CLIENTE
  eliminarCliente(id) {
    return this.http.delete(this.url_backend + '/cliente/eliminar/' + id);
  }
  //ACTIVAR CLIENTE
  activarCliente(id) {
    return this.http.delete(this.url_backend + '/cliente/activar/' + id);
  }
  //BUSCAR CLIENTES ACTIVOS
  buscarActivos(busca) {
    return this.http.get(this.url_backend + '/cliente/busca-activo/' + busca);
  }
  //BUSCAR CLIENTES INACTIVOS
  buscarInactivos(busca) {
    return this.http.get(this.url_backend + '/cliente/busca-inactivo/' + busca);
  }
  obtenerClientePorId(id){
    return this.http.get(this.url_backend+"/cliente/obtener-cliente/"+id);
  }
}
