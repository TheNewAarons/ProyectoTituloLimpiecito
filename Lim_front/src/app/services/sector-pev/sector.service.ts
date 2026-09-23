import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class SectorService {
  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }

  crearSector(sector){
    return this.http.post(this.url_backend+"/sector/crear",{sector})
  }
  obtenerSectoresPorCliente(id_cliente){
    return this.http.get(this.url_backend+"/sector/obtener_sectores_por_cliente/"+id_cliente)
  }
  obtenerSectoresNormalPorCliente(id_cliente){
    return this.http.get(this.url_backend+"/sector/obtener_sectores_normal_por_cliente/"+id_cliente)
  }
  obtenerSectoresActivoPorCliente(id_cliente){
    return this.http.get(this.url_backend+"/sector/obtener_sectores_activo_por_cliente/"+id_cliente)
  }
  cambiarEstadoSector(id_sector, sector){
    return this.http.put(this.url_backend+"/sector/cambiar_estado/"+id_sector,{sector})
  }
  actualizarSector(id_sector, sector){
    return this.http.put(`${this.url_backend}/sector/actualizar/${id_sector}`,{sector})
  }
  eliminarSector(id_sector){
    return this.http.delete(`${this.url_backend}/sector/eliminar_sector/${id_sector}`)
  }

}
