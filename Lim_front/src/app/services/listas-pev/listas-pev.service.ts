import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class ListasPevService {

  url_backend
  constructor(private http:HttpClient) {
    this.url_backend = environment.url;
  }
  obtenerTrabajadoresCronograma(id_cronograma){
    return this.http.get(this.url_backend+"/lista_pev_trabajador/obtener_trabajadores_cronograma/"+id_cronograma)
  }
  obtenerListasPevTrabajador(id_cronograma, n_empleado){
    return this.http.get(this.url_backend+"/lista_pev_trabajador/obtener_listas_pev_trabajador/"+id_cronograma+"/"+n_empleado)
  }
  obtenerListaPevConLineas(id_lista_pev){
    return this.http.get(this.url_backend+"/lista_pev_trabajador/obtener_lista_pev/"+id_lista_pev)
  }
  obtenerTareasCronograma(id_cronograma){
    return this.http.get(this.url_backend+"/lista_pev_trabajador/obtener_tareas_cronograma/"+id_cronograma)
  }
  obtenerTrabajadoresNoAsociadosCronograma(id_cliente,id_cronograma){
    return this.http.get(`${this.url_backend}/lista_pev_trabajador/obtener_trabajadores_no_asociados_cronograma/${id_cliente}/${id_cronograma}`)
  }
  AsociarTrabajadoresCronograma(id_cronograma,trabajadores){
    return this.http.post(this.url_backend+"/lista_pev_trabajador/asociar_trabajadores_seleccionados_cronograma/"+id_cronograma,{trabajadores})
  }
  crearListaPev(lista_pev, tareas){
    return this.http.post(this.url_backend+"/lista_pev_trabajador/crear_lista_pev/",{lista_pev,tareas})
  }
  obtenerTrabajadorNumeroEmpleado(n_empleado){
    return this.http.get(this.url_backend+"/lista_pev_trabajador/obtener_trabajador_n_empleado/"+n_empleado)
  }
  actualizarLineaListaPev(id,linea_lista_pev){
    return this.http.post(this.url_backend+"/lista_pev_trabajador/actualizar_linea_lista_pev/"+id,{linea_lista_pev})
  }
  cambiarEstadoListaPev(id,lista_pev){
    return this.http.put(this.url_backend+"/lista_pev_trabajador/cambiar_estado_lista_pev/"+id,{lista_pev})
  }

  quitarTrabajadorCronograma(id,n_empleado){
    return this.http.delete(`${this.url_backend}/lista_pev_trabajador/eliminar_trabajador/${id}/${n_empleado}`)
  }
}
