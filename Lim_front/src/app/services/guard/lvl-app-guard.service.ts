import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { LoginService } from '../login/login.service';

@Injectable()
export class LvlAppGuardService implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}
  public usuario;

  canActivate() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    if (this.usuario.role.nombre === 'LVL_APP') {
      this.router.navigateByUrl('/adm_servicio/cate_servicios');
      return false;
    }
    return true;
  }
}
