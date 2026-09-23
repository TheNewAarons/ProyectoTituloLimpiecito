import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url;
  }

  //CREAR PRODUCTO
  crearProducto(producto) {
    let producto_json = JSON.stringify(producto);

    return this.http.post(this.url_backend + '/producto/crear', { producto: producto_json });
  }
  //EDITAR PRODUCTO
  editarProducto(producto, id) {
    let producto_json = JSON.stringify(producto);
    return this.http.put(this.url_backend + '/producto/editar/' + id, { producto: producto_json });
  }
  //OBTENER TODOS LOS PRODUCTOS
  obtenerTodos() {
    return this.http.get(this.url_backend + '/producto/todos');
  }

  //OBTENER TODOS LOS PRODUCTOS ACTIVOS CON STOCK > 0
  obtenerStockProductos() {
    return this.http.get(this.url_backend + '/producto/stock_activo');
  }

  //OBTENER PRODUCTOS ACTIVOS
  obtenerProductos() {
    return this.http.get(this.url_backend + '/producto/activo');
  }
  //OBTENER PRODUCTOS INACTIVOS
  obtenerProductosInactivos() {
    return this.http.get(this.url_backend + '/producto/inactivo');
  }

  //ELIMINAR PRODUCTO (CAMBIO DE ESTADO)
  eliminarProducto(id) {
    return this.http.delete(this.url_backend + '/producto/eliminar/' + id);
  }
  //ACTIVAR PRODUCTO (CAMBIAR DE ESTADO)
  activarProducto(id) {
    return this.http.delete(this.url_backend + '/producto/activar/' + id);
  }
  //BORRAR PRODUCTO ( CAMBIO ESTADO)
  borrarProducto(id) {
    return this.http.delete(this.url_backend + '/producto/borrar/' + id);
  }

  //BUSCAR EN PRODUCTOS ACTIVOS
  buscarActivos(busca) {
    return this.http.get(this.url_backend + '/producto/busca-activo/' + busca);
  }
  //BUSCAR EN PRODUCTOS INACTIVOS
  buscarInactivos(busca) {
    return this.http.get(this.url_backend + '/producto/busca-inactivo/' + busca);
  }
}
