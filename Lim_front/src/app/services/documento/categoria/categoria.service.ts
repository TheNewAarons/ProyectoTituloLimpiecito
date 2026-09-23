import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/categoria';
  }

  //CREAR CATEGORIA
  crearCategoria(categoria) {
    let categoria_json = JSON.stringify(categoria);
    return this.http.post(this.url_backend + '/crear', { categoria: categoria_json });
  }
  //CREAR CATEGORIA
  editarCategoria(categoria, idCategoria) {
    let categoria_json = JSON.stringify(categoria);
    return this.http.put(this.url_backend + '/editar/' + idCategoria, { categoria: categoria_json });
  }

  //OBTENER CATEGORIAS ACTIVAS
  obtenerCategoriasActivas() {
    return this.http.get(this.url_backend + '/obtener-activos');
  }

  //OBTENER CATEGORIAS INACTIVAS
  obtenerCategoriasInactivas() {
    return this.http.get(this.url_backend + '/obtener-inactivos');
  }

  //DESACTIVAR CATEGORIA NO SE USA
  eliminarCategoria(idCategoria) {
    return this.http.delete(this.url_backend + '/eliminar/' + idCategoria);
  }
}
