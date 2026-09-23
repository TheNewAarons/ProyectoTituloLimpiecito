import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class TurnoTareaService {

  url_backend
  constructor(private http:HttpClient) { 
    this.url_backend = environment.url;
  }
  asociarTurnoTarea(turno_tarea){
    return this.http.post(this.url_backend+"/turno_tarea/asociar",{turno_tarea})
  }
  cambiarEstadoTurnoTarea(id,turno_tarea){
    return this.http.put(this.url_backend+"/turno_tarea/cambiar_estado/"+id,{turno_tarea})
  }
}
