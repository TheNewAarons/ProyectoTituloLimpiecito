import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class HorarioService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/horario';
  }

  //CREAR HORARIO
  crearHorario(horario) {
    return this.http.post(this.url_backend + '/crear', { horario });
  }

  //EDITAR HORARIO
  editarHorario(idHorario, horario) {
    return this.http.put(this.url_backend + '/editar/' + idHorario, { horario });
  }
  //ACTIVAR HORARIO
  activarHorario(idHorario) {
    return this.http.delete(this.url_backend + '/activar/' + idHorario);
  }
  //DESACTIVAR HORARIO
  desactivarHorario(idHorario) {
    return this.http.delete(this.url_backend + '/desactivar/' + idHorario);
  }
  //OBTENER HORARIO
  obtenerHorarioSolo(idHorario) {
    return this.http.get(this.url_backend + '/obtener-horario-solo/' + idHorario);
  }

  /** FUNCIONES DE DIA */
  obtenerDia(idDia){
    return this.http.get(this.url_backend + '/obtener-dia-bloques/'+ idDia)
  }

  desactivarDia(idDia){
    return this.http.delete(this.url_backend+ '/desactivar-dia/'+ idDia)
  }
  activarDia(idDia){
    return this.http.delete(this.url_backend+ '/activar-dia/' + idDia)
  }
}
