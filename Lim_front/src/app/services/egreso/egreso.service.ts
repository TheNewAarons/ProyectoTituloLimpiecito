import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'


@Injectable({
  providedIn: 'root'
})
export class EgresoService {

  public url_backend;

  constructor(private http:HttpClient) { 
    this.url_backend = environment.url
  }

  //CREAR EGRESO
  crearEgreso(egreso){
    let egreso_json = JSON.stringify(egreso);
    return this.http.post(this.url_backend+"/egreso/crear",{ egreso: egreso_json});
  } 

  //ELIMINAR EGRESO
  eliminarEgreso(id){
    return this.http.delete(this.url_backend+"/egreso/eliminar/"+id);
  }

  //OBTENER EGRESOS
  obtenerEgresos(){
    return this.http.get(this.url_backend+"/egreso/obtener");
  }

  //OBTENER EGRESOS POR CAJA
  obtenerEgresosCaja(id){
    return this.http.get(this.url_backend+"/egreso/obtener-caja/"+id);
  }
}
