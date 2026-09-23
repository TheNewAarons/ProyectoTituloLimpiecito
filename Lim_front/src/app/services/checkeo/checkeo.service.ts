import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CheckeoService {

  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url
  }

  crearCheckeo(checkeo){
    return this.http.post(`${this.url_backend}/checkeo/crear`,{checkeo})
  }

  editarCheckeo(id,checkeo){
    return this.http.put(`${this.url_backend}/checkeo/editar/${id}`,{checkeo})
  }

  eliminarCheckeo(id){
    return this.http.delete(`${this.url_backend}/checkeo/eliminar/${id}`)
  }

}
