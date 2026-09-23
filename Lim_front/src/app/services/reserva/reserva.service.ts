import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/reserva';
  }

  //OBTENER RESERVAS EN PROCESO
  obtenerReservaProceso(id) {
    return this.http.get(this.url_backend + '/obtener-reservas-proceso/' + id);
  }
  //OBTENER RESERVAS RECHAZADAS
  obtenerReservaRechazada(id) {
    return this.http.get(this.url_backend + '/obtener-reservas-rechazada/' + id);
  }
  //OBTENER RESERVAS APROBADAS
  obtenerReservaAprobada(id) {
    return this.http.get(this.url_backend + '/obtener-reservas-aprobada/' + id);
  }
  //OBTENER RESERVAS FINALIZADAS
  obtenerReservaFinalizada(id) {
    return this.http.get(this.url_backend + '/obtener-reservas-finalizada/' + id);
  }
  //OBTENER RESERVA POR ID CON TODOS SUS DATOS
  obtenerReserva(idReserva) {
    return this.http.get(this.url_backend + '/obtener-reserva/' + idReserva);
  }

  //APROBAR RESERVA
  aprobarReserva(idReserva) {
    return this.http.delete(this.url_backend + '/aprobar-reserva/' + idReserva);
  }

  //RECHAZAR RESERVA
  rechazarReserva(idReserva) {
    return this.http.delete(this.url_backend + '/rechazar-reserva/' + idReserva);
  }

  //FINALIZAR RESERVA
  finalizarReserva(idReserva) {
    return this.http.delete(this.url_backend + '/finalizar-reserva/' + idReserva);
  }


  //OBTENER RESERVAS POR USUARIOS
   obtenerReservasUsuario(idUsuario,estado?){
    return this.http.get(this.url_backend+"/obtener-reservas-usuario/"+idUsuario+"/"+estado);
   }
}
