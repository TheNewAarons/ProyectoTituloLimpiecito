import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AccesoLaboralService {

  public url_backend;
 
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
   }

   crearAccesoLaboral(acceso_laboral){
    return this.http.post(this.url_backend+"/acces_laboral/crear",{acceso_laboral});
   }
   existeAccesoLaboral(trabajadoreId){
    return this.http.get(this.url_backend+"/acces_laboral/existe_acceso_laboral/"+trabajadoreId);
   }
   actualizarAccesoLaboral(id,acceso_laboral){
    console.log(acceso_laboral)
    return this.http.put(this.url_backend+"/acces_laboral/actualizar/"+id,{acceso_laboral});
   }
}
