import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CateServicioService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/cate_servicio';
  }

  //CREAR CATEGORIA SERVICIO
  crearCategoriaServicio(cateServicio) {
    return this.http.post(this.url_backend + '/crear', cateServicio);
  }

  //EDITAR CATEGORIA SERVICIO
  editarCategoriaServicio(cateServicio, idCateServicio) {
    return this.http.put(this.url_backend + '/editar/' + idCateServicio, cateServicio);
  }

  //OBTENER CATEGORIAS SERVICIO ACTIVO
  obtenerCateServicioActivo() {
    return this.http.get(this.url_backend + '/obtener-cate-serv-activos');
  }

  //OBTENER CATEGORIAS SERVICIO INACTIVO
  obtenerCateServicioInactivo() {
    return this.http.get(this.url_backend + '/obtener-cate-serv-inactivos');
  }

  //OBTENER CATEGORIA SERVICIO POR ID
  obtenerCateServicio(idCateServicio) {
    return this.http.get(this.url_backend + '/obtener-cate-servicio/' + idCateServicio);
  }

  //ACTIVAR CATEGORIA SERVICIO
  activarCateServicio(idCateServicio) {
    return this.http.delete(this.url_backend + '/activar-cate/' + idCateServicio);
  }
  //DESACTIVAR CATEGORIA SERVICIO
  desactivarCateServicio(idCateServicio) {
    return this.http.delete(this.url_backend + '/desactivar-cate/' + idCateServicio);
  }

  /** FUNCIONES DE DESCRIPCIONES, ARTICULOS Y ELIMINAR */

  //EDITAR DESCRIPCION
  editarDescripcion(descripcion, idDescripcion) {
    return this.http.put(this.url_backend + '/editar-descripcion/' + idDescripcion, { descripcion });
  }

  //ELIMINAR DESCRIPCION
  eliminarDescripcion(idDescripcion) {
    return this.http.delete(this.url_backend + '/eliminar-descripcion/' + idDescripcion);
  }
  //EDITAR HERRAMIENTA
  editarHerramienta(herramienta, idHerramienta) {
    return this.http.put(this.url_backend + '/editar-herramienta/' + idHerramienta, { herramienta });
  }
  //ELIMINAR HERRAMIENTA
  eliminarHerramienta(idHerramienta) {
    return this.http.delete(this.url_backend + '/eliminar-herramienta/' + idHerramienta);
  }

  //EDITAR ARTICULO
  editarArticulo(articulo, idArticulo) {
    return this.http.put(this.url_backend + '/editar-articulo/' + idArticulo, { articulo });
  }
  //ELIMINAR ARTICULO
  eliminarArticulo(idArticulo) {
    return this.http.delete(this.url_backend + '/eliminar-articulo/' + idArticulo);
  }

  /** IMAGEN EXTRA */
  //CREAR IMAGEN EXTRA
  crearImagen(imagen) {
    return this.http.post(this.url_backend + '/crear-img-extra', imagen);
  }

  //EDITAR IMAGEN EXTRA
  editarImagen(imagen,idImagen) {
    return this.http.put(this.url_backend + '/editar-img-extra/'+idImagen, imagen);
  }

  //OBTENER IMAGEN EXTRA
  obtenerImagen(idImagen){
    return this.http.get(this.url_backend+'/obtener-img-extra/'+idImagen)
  }

}
