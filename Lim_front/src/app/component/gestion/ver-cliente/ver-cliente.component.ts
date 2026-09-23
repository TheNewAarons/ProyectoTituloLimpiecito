import { Component, OnInit } from '@angular/core';
import { ClienteService } from 'src/app/services/cliente/cliente.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AccesoService } from 'src/app/services/documento/acceso/acceso.service';
import { LoginService } from 'src/app/services/login/login.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

declare const $: any;

@Component({
  selector: 'app-ver-cliente',
  templateUrl: './ver-cliente.component.html',
  styleUrls: ['./ver-cliente.component.css']
})
export class VerClienteComponent implements OnInit {
  public cliente;
  public idCliente;
  public loading = true;
  public newPassword = '';
  public idChangePass;
  public usuario;

  constructor(
    private clienteService: ClienteService,private route: ActivatedRoute,
    private loginService: LoginService,private accesoService: AccesoService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.obtenerDatosUsuario();
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }

  //OBTENER ID
  obtenerId() {
    this.idCliente = this.route.snapshot.paramMap.get('idCliente');
    this.alertaService.loading()
    this.obtenerCliente(this.idCliente);
  }

  //OBTENER CLIENTE POR ID
  obtenerCliente(id) {
    this.clienteService.obtenerCliente(id).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.cliente = response.cliente;
        this.loading = !this.loading;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //DESACTIVAR ACCESO
  desactivarAcceso(idAcceso) {
    this.alertaService.loading()
    this.accesoService.desactivarAccesoCliente(idAcceso).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.obtenerCliente(this.idCliente);
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //ACTIVAR ACCESO
  activarAcceso(idAcceso) {
    this.alertaService.loading()
    this.accesoService.activarAccesoCliente(idAcceso).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.obtenerCliente(this.idCliente);
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //RECIBE ID DEL ACCESO A CAMBIAR CONTRASEÑA
  datosCambiarPass(id) {
    this.idChangePass = id;
  }
  //CAMBIAR CONTRASEÑA
  cambiarPassword(valid) {
    if (valid) {
      this.alertaService.loading()
      this.newPassword = btoa(this.newPassword);
      this.accesoService.cambiarPassAcessoCliente(this.idChangePass, this.newPassword).subscribe(
        (response: any) => {
          if (response.filas > 0) {
            this.loading = !this.loading;
            this.obtenerCliente(this.idCliente);
            $('#changePasswordModal').modal('hide');
          }
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //ELIMINAR ACCESO
  eliminarAcceso(idAcceso) {
    this.alertaService.loading()
    this.accesoService.eliminarAccesoCliente(idAcceso).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.obtenerCliente(this.idCliente);
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
}
