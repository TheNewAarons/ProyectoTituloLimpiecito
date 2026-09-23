import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class TareaService {

  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }
  crearTarea(tarea, turnos){
    return this.http.post(this.url_backend+"/tarea/crear",{tarea,turnos})
  }
  obtenerTareasPorArea(id_area){
    return this.http.get(this.url_backend+"/tarea/obtener_tareas_por_area/"+id_area)
  }
  cambiarEstadoTarea(id, tarea){
    return this.http.put(this.url_backend+"/tarea/cambiar_estado/"+id,{tarea})
  }
  actualizarTarea(id_tarea,tarea){
    return this.http.put(`${this.url_backend}/tarea/actualizar/${id_tarea}`,{tarea})
  }
  eliminarTarea(id_tarea){
    return this.http.delete(`${this.url_backend}/tarea/eliminar_tarea/${id_tarea}`)
  }
}
