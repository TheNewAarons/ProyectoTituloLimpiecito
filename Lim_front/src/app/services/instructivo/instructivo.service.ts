import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class InstructivoService {

  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/instructivo';
  }

  //CREAR INSTRUCTIVO
  crearInstructivo(instructivo) {
    return this.http.post(this.url_backend + '/crear', instructivo);
  }

  //EDITAR INSTRUCTIVO 
   editarInstructivoo(instructivo, idInstructivo) {
    return this.http.put(this.url_backend + '/editar/' + idInstructivo, instructivo);
  }

  //OBTENER INSTRUCTIVOS
  obtenerInstructivos() {
    return this.http.get(this.url_backend + '/obtener-instructivos');
  }
  //OBTENER INSTRUCTIVO POR ID 
  obtenerInstructivo(idInstructivo) {
    return this.http.get(this.url_backend + '/obtener-instructivo/'+idInstructivo);
  }

  //ELIMINAR INSTRUCTIVO
  eliminarInstructivo(idInstructivo){
    return this.http.delete(this.url_backend+'/eliminar-instructivo/'+idInstructivo)
  }
}
