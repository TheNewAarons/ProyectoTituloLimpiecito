import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { LoginService } from '../login/login.service';

@Injectable()
export class AppGuardService implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}
  public usuario;

  canActivate() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    if (this.usuario.role.nombre != 'ADMINISTRADOR') {
      this.router.navigateByUrl('/centro_costos');
      return false;
    }
    return true;
  }
}
