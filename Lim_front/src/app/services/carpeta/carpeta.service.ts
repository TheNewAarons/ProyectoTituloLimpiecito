import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CarpetaService {

  public url_backend;
  public url_api_archivo

  constructor(private http:HttpClient) {
    this.url_backend = environment.url
    this.url_api_archivo = environment.url_api_archivo
  }

  obtenerClientes(){
    return this.http.get(`${this.url_backend}/cliente/obtener-clientes-carpeta`)
  }
  buscarCliente(busca){
    return this.http.get(`${this.url_backend}/cliente/buscar-clientes-carpeta/${busca}`)
  } 
  crearCarpetaPadre(id_cliente){
    return this.http.post(`${this.url_backend}/carpeta_padre/crear`,{id_cliente})
  }
  crearCarpetaHijos(carpetas){
    return this.http.post(`${this.url_backend}/carpeta/crear`,{carpetas})
  }
  obtenerCarpetasDelPadre(id_carpeta_padre){
    return this.http.get(`${this.url_backend}/carpeta/obtener-sub-carpetas/${id_carpeta_padre}`)
  }
  obtenerSubCarpetasHijo(id_carpeta){
    return this.http.get(`${this.url_backend}/carpeta/obtener-carpetas-hijos/${id_carpeta}`)
  }
  busquedaDocumentos(id_carpeta,busca){
    return this.http.get(`${this.url_backend}/carpeta_documento/buscar-documentos/${id_carpeta}/${busca}`)
  }
  eliminarInstanciaDocumento(id_carpeta,id_documento,nombre_archivo,id_cliente){
    return this.http.delete(`${this.url_backend}/carpeta_documento/eliminar-documento/${id_carpeta}/${id_documento}/${nombre_archivo}/${id_cliente}`)
  }
  eliminarCarpetaHijo(id_carpeta, id_carpeta_padre){
    return this.http.delete(`${this.url_backend}/carpeta/eliminar-carpeta-hijo/${id_carpeta}/${id_carpeta_padre}`)
  }
  //** LLAMADA A API ARCHIVO */
  crearDocumentos(pdfs, id_cliente,ruta){
    return this.http.post(`${this.url_api_archivo}/archivo/crear/${id_cliente}/${ruta}`,pdfs)
  }
  descargarArchivo(nombre_archivo) {
    return this.http.get(this.url_api_archivo + '/archivo/descargar-archivo/' + nombre_archivo, {
      responseType: 'blob'
    });
  }

}
