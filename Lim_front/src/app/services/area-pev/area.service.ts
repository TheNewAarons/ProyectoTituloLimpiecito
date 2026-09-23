import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }
  crearArea(area){
    return this.http.post(this.url_backend+"/area/crear",{area})
  }
  obtenerAreasPorSector(id_sector){
    return this.http.get(this.url_backend+"/area/obtener_areas_por_sector/"+id_sector)
  }
  obtenerAreasActivasPorSector(id_sector){
    return this.http.get(this.url_backend+"/area/obtener_areas_activas_por_sector/"+id_sector)
  }
  obtenerAreasActivasPorCliente(id_cliente){
    return this.http.get(this.url_backend+"/area/obtener_areas_activas_por_cliente/"+id_cliente)
  }
  cambiarEstadoArea(id_area, area){
    return this.http.put(this.url_backend+"/area/cambiar_estado/"+id_area,{area})
  }
  actualizarArea(id_area,area){
    return this.http.put(`${this.url_backend}/area/actualizar/${id_area}`,{area})
  }
  eliminarArea(id_area){
    return this.http.delete(`${this.url_backend}/area/eliminar_area/${id_area}`)
  }
}
