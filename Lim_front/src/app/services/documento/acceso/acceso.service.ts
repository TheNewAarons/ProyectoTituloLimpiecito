import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/acceso';
  }

  //CREAR ACCESO CLIENTE
  crearAccesoCliente(acceso_cliente) {
    let acceso_cliente_json = JSON.stringify(acceso_cliente);
    return this.http.post(this.url_backend + '/crear-acceso-cliente', { acceso_cliente: acceso_cliente_json });
  }

  //CREAR ACCESO TRABAJADOR
  crearAccesoTrabajador(idTrabajador, acceso_trabajador) {
    let acceso_trabajador_json = JSON.stringify(acceso_trabajador);
    return this.http.post(this.url_backend + '/crear-acceso-trabajador/' + idTrabajador, { acceso_trabajador: acceso_trabajador_json });
  }
  //DESACTIVAR ACCESO CLIENTE
  desactivarAccesoCliente(idAcceso) {
    return this.http.delete(this.url_backend + '/desactivar-acceso-cliente/' + idAcceso);
  }
  //DESACTIVAR ACCESO TRABAJADOR
  desactivarAccesoTrabajador(idAcceso) {
    return this.http.delete(this.url_backend + '/desactivar-acceso-trabajador/' + idAcceso);
  }
  //ACTIVAR ACCESO CLIENTE
  activarAccesoCliente(idAcceso) {
    return this.http.delete(this.url_backend + '/activar-acceso-cliente/' + idAcceso);
  }
  //DESACTIVAR ACCESO TRABAJADOR
  activarAccesoTrabajador(idAcceso) {
    return this.http.delete(this.url_backend + '/activar-acceso-trabajador/' + idAcceso);
  }
  //CAMBIAR CONTRASEÑA ACCESO CLIENTE
  cambiarPassAcessoCliente(idAcceso, new_password) {
    return this.http.put(this.url_backend + '/editar-password-acceso-cliente/' + idAcceso, { new_password });
  }
  //CAMBIAR CONTRASEÑA ACCESO TRABAJADOR
  cambiarPassAccesoTrabajador(idAcceso, new_password) {
    return this.http.put(this.url_backend + '/editar-password-acceso-trabajador/' + idAcceso, { new_password });
  }

  //ELIMINAR ACCESO CLIENTE
  eliminarAccesoCliente(idAcceso) {
    return this.http.delete(this.url_backend + '/eliminar-acceso-cliente/' + idAcceso);
  }

  //CAMBIAR CORREO ACCESO TRABAJADOR
  cambiarCorreoAccesoTrabajador(idAcceso, new_correo) {
    return this.http.put(this.url_backend + '/editar-correo-acceso-trabajador/' + idAcceso, { correo: new_correo });
  }
}
