import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class DescuentoService {

  public url_backend;
 
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
   }
   /*** SERVICIOS DE AFP  */
   //CREAR AFP ( INSTITUTO PREVISION)
   crearAfp(afp){
    let afp_json = JSON.stringify(afp);
    return this.http.post(this.url_backend+"/instituto_prevision/crear",{instituto_previsione: afp_json})
   }
   //EDITAR AFP ( INSTITUTO PREVISION)
   editarAfp(afp,id){
    let afp_json = JSON.stringify(afp);
    return this.http.put(this.url_backend+"/instituto_prevision/editar/"+id,{instituto_previsione: afp_json})
   }
   //OBTENER AFPS
   obtenerAfps(){
    return this.http.get(this.url_backend+"/instituto_prevision/todos");
   }
   //OBTENER AFPS ACTIVOS
   obtenerActivosAfp(){
    return this.http.get(this.url_backend+"/instituto_prevision/activos");
   }
   //OBTENER AFPS INACTIVOS
   obtenerInactivosAfp(){
    return this.http.get(this.url_backend+"/instituto_prevision/inactivos");
   }
   //ACTIVAR AFP
   activarAfp(id){
    return this.http.delete(this.url_backend+"/instituto_prevision/activar/"+id)
   }
   //DESACTIVAR AFP
   desactivarAfp(id){
    return this.http.delete(this.url_backend+"/instituto_prevision/eliminar/"+id)
   }


   /**** SERVICIOS DE SALUD */
   //CREAR SALUD 
   crearSalud(salud){
    let salud_json = JSON.stringify(salud);
    return this.http.post(this.url_backend+"/salud/crear",{salude: salud_json})
   }
   //EDITAR SALUD
   editarSalud(salud,id){
    let salud_json = JSON.stringify(salud);
    return this.http.put(this.url_backend+"/salud/editar/"+id,{salude: salud_json})
   }
   //OBTENER SALUDS
   obtenerSaludes(){
    return this.http.get(this.url_backend+"/salud/todos");
   }
   //OBTENER SALUD ACTIVOS
   obtenerSaludActivos(){
    return this.http.get(this.url_backend+"/salud/activos");
   }
   //OBTENER SALUD INACTIVOS
   obtenerSaludInactivos(){
    return this.http.get(this.url_backend+"/salud/inactivos");
   }
   //ACTIVAR SALUD 
   activarSalud(id){
    return this.http.delete(this.url_backend+"/salud/activar/"+id)
   }
   //DESACTIVAR SALUD
   desactivarSalud(id){
    return this.http.delete(this.url_backend+"/salud/eliminar/"+id)
   }


   /**** SERVICIOS DE SEGURO */
   //CREAR SEGURO
   crearSeguro(seguro){
    let seguro_json = JSON.stringify(seguro);

    return this.http.post(this.url_backend+"/seguro/crear",{seguro:seguro_json})
   }
   //EDITAR SEGURO
   editarSeguro(seguro,id){
    let seguro_json = JSON.stringify(seguro);

    return this.http.put(this.url_backend+"/seguro/editar/"+id,{ seguro:seguro_json})
   }
   //OBTENER SEGURO
   obtenerSeguros(){
    return this.http.get(this.url_backend+"/seguro/todos");
   }
   //OBTENER SEGURO ACTIVOS
   obtenerSeguroActivos(){
    return this.http.get(this.url_backend+"/seguro/activos");
   }
   //OBTENER SEGURO INACTIVOS
   obtenerSeguroInactivos(){
    return this.http.get(this.url_backend+"/seguro/inactivos");
   }
   //ACTIVAR SEGURO 
   activarSeguro(id){
    return this.http.delete(this.url_backend+"/seguro/activar/"+id)
   }
   //DESACTIVAR SEGURO
   desactivarSeguro(id){
    return this.http.delete(this.url_backend+"/seguro/eliminar/"+id)
   }


}
