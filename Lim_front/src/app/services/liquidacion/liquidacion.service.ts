import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class LiquidacionService {

  public url_backend;
 
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
   }

  //CREAR LIQUIDACION
  crearLiquidacion(liquidacion,id){
    let liquidacion_json = JSON.stringify(liquidacion);
    return this.http.post(this.url_backend+"/liquidacion/crear/"+id,{ liquidacion: liquidacion_json});
  }

  //EDITAR LIQUIDACION
  editarLiquidacion(id,liquidacion){
    let liquidacion_json = JSON.stringify(liquidacion);
    return this.http.put(this.url_backend+"/liquidacion/editar/"+id,{liquidacion:liquidacion_json});
  }
  //OBTENER LIQUIDACION POR ID 
  obtenerLiquidacionId(id){
    return  this.http.get(this.url_backend+"/liquidacion/obtener/"+id);
  }
  //CERRAR LIQUIDACION
  cerrarLiquidacion(id){
    return this.http.delete(this.url_backend+"/liquidacion/cerrar/"+id);
  }

  //OBTENER TODAS LAS LIQUIDACIONES
  obtenerLiquidaciones(){
    return this.http.get(this.url_backend+"/liquidacion/obtener-todos");
  }

  obtenerBusqueda(busca){
    return  this.http.get(this.url_backend+"/liquidacion/obtener-busca/"+busca);
  }

  


}
