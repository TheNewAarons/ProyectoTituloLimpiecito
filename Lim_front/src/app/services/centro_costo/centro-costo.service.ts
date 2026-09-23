import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CentroCostoService {

  public url_backend;

  constructor(private http: HttpClient) { 
    this.url_backend = environment.url;
  }

  //CREAR CENTRO DE COSTO
  crearCentro(centro){
    let centro_json = JSON.stringify(centro);
    return this.http.post(this.url_backend+"/centro/crear",{centro_costo:centro_json});
  }

  //EDITAR CENTRO DE COSTO
  editarCentro(centro,id){
    let centro_json = JSON.stringify(centro);
    return this.http.put(this.url_backend+"/centro/editar/"+id,{centro_costo:centro_json});
  }

  //OBTENER CENTRO POR ID CAJA
  obtenerCentroId(id){
    return this.http.get(this.url_backend+"/centro/obtener/"+id);
  }
  //OBTENER CENTRO DE COSTOS ACTIVOS POR ID CAJA ACTUAL
  obtenerActivos(id){
    return this.http.get(this.url_backend+"/centro/activo/"+id);
  }
  //OBTENER CENTRO DE COSTOS INACTIVOS POR ID CAJA ACTUAL
  obtenerInactivos(id){
    return this.http.get(this.url_backend+"/centro/inactivo/"+id);
  }
  //OBTENER CENTRO DE COSTOS ACTIVOS POR CAJA ACTUAL Y BUSQUEDA
  obtenerBuscaActivos(id,buscaActivo){
    return this.http.get(this.url_backend+"/centro/busca-activo/"+id+"/"+buscaActivo)
  }
  //OBTENER CENTRO DE COSTOS INACTIVOS POR CAJA ACTUAL Y BUSQUEDA
  obtenerBuscaInactivos(id,buscaInactivo){
    return this.http.get(this.url_backend+"/centro/busca-inactivo/"+id+"/"+buscaInactivo)
  }

  //CERRAR CENTRO DE COSTO
  cerrarCentro(centro,id){
    let centro_json = JSON.stringify(centro);
    return this.http.put(this.url_backend+"/centro/cerrar/"+id,{centro_costo:centro_json});
  }
  //OBTENER TODOS LOS CENTROS POR ID
  obtenerCentroCaja(id){
    return this.http.get(this.url_backend+"/centro/todos/"+id);
  }

  //** SERVICIOS PARA TABLAS INCLUIDAS AL CENTRO DE COSTO */

  //CREAR ASOCIACION DE TRABAJADORES
  crearAsociacion(asociacion){
    let asociacion_json = JSON.stringify(asociacion);
    return this.http.post(this.url_backend+"/detalle/crear-asociacion",{asociacion:asociacion_json});
  }
  //ELIMINAR ASOCIACION DE TRABAJADORES
  eliminarAsociacion(idAsociacion){
    return this.http.delete(this.url_backend+"/detalle/eliminar-asociacion/"+idAsociacion);
  }

  //CREAR LISTA DE INSUMO
  crearLista(lista,lineas){
    let lista_json = JSON.stringify(lista);
    let lineas_json = JSON.stringify(lineas);
    return this.http.post(this.url_backend+"/detalle/crear-lista",{lista_insumo:lista_json,lineasInsumos:lineas_json});
  }
  //APROBAR LISTA DE INSUMO
  aprobarLista(id, id_usuario){
    return this.http.delete(this.url_backend+"/detalle/aprobar-lista/"+id+"/"+id_usuario);
  }
  //ELIMINAR LISTA DE INSUMO
  eliminarLista(idLista){
    return this.http.delete(this.url_backend+"/detalle/eliminar-lista/"+idLista);
  }


  //CREAR EGRESOS DEL CC
  crearEgreso(egreso){
    let egreso_json = JSON.stringify(egreso);
    return this.http.post(this.url_backend+"/detalle/crear-egreso",{egreso:egreso_json});
  }
  //ELIMINAR EGRESO DEL CC
  eliminarEgreso(idEgreso){
    return this.http.delete(this.url_backend+"/detalle/eliminar-egreso/"+idEgreso);
  }

  //CREAR INGRESOS DEL CC
  crearIngreso(ingreso){
    let ingreso_json = JSON.stringify(ingreso);
    return this.http.post(this.url_backend+"/detalle/crear-ingreso",{ingreso:ingreso_json});
  }
  //ELIMINAR INGRESO DEL CC
  eliminarIngreso(idIngreso){
    return this.http.delete(this.url_backend+"/detalle/eliminar-ingreso/"+idIngreso);
  }

}
