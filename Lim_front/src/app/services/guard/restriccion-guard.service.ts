import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { LoginService } from '../login/login.service';

@Injectable()
export class RestriccionGuardService implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}
  public usuario;

  canActivate() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    if (this.usuario.role.nombre === 'APOYO_LVL_1') {
      this.router.navigateByUrl('/centro_costos');
      return false;
    }
    return true;
  }
}
