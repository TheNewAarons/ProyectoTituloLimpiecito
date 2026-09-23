import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ListasSupervisorService {

  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }

  crearListaSupervisor(listasPevTrabajadoreId,n_empleado,tareas){
    return this.http.post(`${this.url_backend}/lista_supervisor/crear_lista_super`,{listasPevTrabajadoreId,n_empleado,tareas})
  }

  obtenerListaSupervisor(id_lista_supervisor){
    return this.http.get(`${this.url_backend}/lista_supervisor/obtener_lista_super/${id_lista_supervisor}`)
  }

  actualizarLineaListaSupervisor(id,linea_lista_supervisor){
    return this.http.put(`${this.url_backend}/lista_supervisor/actualizar_linea_lista_super/${id}`,{linea_lista_supervisor})
  }

  cambiarEstadoListaSupervisor(id,lista_supervisor){
    return this.http.put(`${this.url_backend}/lista_supervisor/cambiar_estado_lista_super/${id}`,{lista_supervisor})
  }

  // * Obtener trabajadores con acceso laboral "trabajador y supervisor" (1)
  obtenerTrabajadoresSupervisor(){
    return this.http.get(`${this.url_backend}/lista_supervisor/obtener_trabajadores_supervisor`)
  }

  obtenerTrabajador(n_empleado){
    return this.http.get(`${this.url_backend}/lista_supervisor/obtener_trabajador/${n_empleado}`)
  }
}
