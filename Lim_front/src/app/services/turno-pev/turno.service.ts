import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class TurnoService {

  url_backend
  constructor(private http:HttpClient) { 
    this.url_backend = environment.url;
  }
  crearTurnos(turno){
    return this.http.post(this.url_backend+"/turno/crear-lote",{turno})
  }
  obtenerTurnos(id_cliente){
    return this.http.get(this.url_backend+"/turno/obtener_turnos_por_cliente/"+id_cliente)
  }
  cambiarEstadoTurno(id,turno){
    return this.http.put(this.url_backend+"/turno/cambiar_estado/"+id,{turno})
  }
  obtenerTurnosPorCliente(id_cliente){
    return this.http.get(this.url_backend+"/turno/obtener_turnos_por_cliente/"+id_cliente)
  }
}
