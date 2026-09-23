import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'
import { environment } from '../../../environments/environment'
@Injectable({
  providedIn: 'root'
})
export class TrabajadorService {

  public url_backend;
 
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
   }

   //CREAR TRABAJADOR
   crearTrabajador(trabajador,dato_liquidacione){
     let trabajador_json = JSON.stringify(trabajador);
     let dato_liquidacione_json = JSON.stringify(dato_liquidacione);

     return this.http.post(this.url_backend+"/trabajador/crear",{trabajadore: trabajador_json,dato_liquidacione:dato_liquidacione_json});
   }

   //EDITAR TRABAJADOR
   editarTrabajador(trabajador,id){
     let trabajador_json = JSON.stringify(trabajador)
     return this.http.put(this.url_backend+"/trabajador/editar/"+id,{ trabajadore: trabajador_json})
   }

   //OBTENER TRABAJADORES ACTIVOS
   obtenerTrabajadoresActivos(){
    return this.http.get(this.url_backend+"/trabajador/activos");
   }

   //OBTENER TRABAJADORES INACTIVOS
   obtenerTrabajadoresInactivos(){
    return this.http.get(this.url_backend+"/trabajador/inactivos");
   }

   //OBTENER TODOS LOS TRABAJADORES
   obtenerTodos(){
    return this.http.get(this.url_backend+"/trabajador/todos");
   }

   //ELIMINAR (DESACTIVAR) TRABAJADOR
   eliminarTrabajador(id){
     return this.http.delete(this.url_backend+"/trabajador/eliminar/"+id);
   }

   //ACTIVAR TRABAJADOR
   activarTrabajdor(id){
     return this.http.delete(this.url_backend+"/trabajador/activar/"+id);
   }

   //OBTENER TRABAJADOR POR ID 
   obtenerTrabajadorId(id){
    return this.http.get(this.url_backend+"/trabajador/obtener/"+id);
   }
   //BUSCAR TRABAJADORES ACTIVOS
   buscarActivos(busca){
    return this.http.get(this.url_backend+"/trabajador/busca-activos/"+busca);
   }
   //BUSCAR TRABAJADORES INACTIVOS
   buscarInactivos(busca){
    return this.http.get(this.url_backend+"/trabajador/busca-inactivos/"+busca);
   }

}
