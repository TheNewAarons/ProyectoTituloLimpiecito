import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CronogramaService {

  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url
  }

  crearCronograma(cronograma,lineas_cronograma){
    return this.http.post(`${this.url_backend}/cronograma/crear-cronograma`,{cronograma,lineas_cronograma})
  }
  editarCronograma(cronograma,id){
    return this.http.put(`${this.url_backend}/cronograma/editar-cronograma/${id}`,{cronograma})
  }
  crearLineaCronograma(linea_cronograma,id_sector){
    return this.http.post(`${this.url_backend}/cronograma/crear-linea-cronograma`,{linea_cronograma,id_sector})
  }
  eliminarLineaCronograma(id,tareaId,cronogramaId,sectoreId){
    return this.http.delete(`${this.url_backend}/cronograma/eliminar-linea-cronograma/${id}/${tareaId}/${cronogramaId}/${sectoreId}`)
  }
  obtenerCronograma(id){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronograma/${id}`)
  }
  obtenerTareaTurnoPorTurnoId(id_turno){
    return this.http.get(`${this.url_backend}/cronograma/obtener-tarea-turno-id-turno/${id_turno}`)
  }

  obtenerCronogramasActivos(id_cliente){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronogramas-activos-cliente/${id_cliente}`)
  }

  obtenerCronogramasInactivos(id_cliente){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronogramas-inactivos-cliente/${id_cliente}`)
  }

  obtenerTurnosPorCliente(id_cliente){
    return this.http.get(`${this.url_backend}/cronograma/obtener_turnos_clientes/${id_cliente}`)
  }

  obtenerCronogramaActivosMes(id_cliente,mes){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronogramas-activos-cliente-mes/${id_cliente}/${mes}`)
  }

  obtenerCronogramaActivosMesAnio(id_cliente,mes,anio){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronogramas-activos-mes-anio/${id_cliente}/${mes}/${anio}`)
  }

  obtenerCronogramaInactivosMesAnio(id_cliente,mes,anio){
    return this.http.get(`${this.url_backend}/cronograma/obtener-cronogramas-inactivos-mes-anio/${id_cliente}/${mes}/${anio}`)
  }

  finalizarCronograma(id_cronograma){
    return this.http.delete(`${this.url_backend}/cronograma/finalizar-cronograma/${id_cronograma}`)
  }

  /*** ELIMINAR TODO LO RELACIONADO AL CRONOGRAMA */
  eliminarCronograma(id_cronograma){
    return this.http.delete(`${this.url_backend}/cronograma/eliminar-cronograma/${id_cronograma}`)
  }
}
