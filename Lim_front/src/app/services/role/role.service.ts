import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  public url_backend;

  constructor(private http: HttpClient) { 
    this.url_backend = environment.url;
  }

  //OBTENER ROLES ACTIVOS
  obtenerRolesActivos(){
    return this.http.get(this.url_backend+"/rol/obtener");
  }


}
