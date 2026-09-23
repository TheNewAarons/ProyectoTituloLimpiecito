import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { LoginService } from '../login/login.service';

@Injectable()
export class ArchivoGuardService implements CanActivate {
  constructor(private loginService: LoginService, private router: Router) {}
  public usuario;

  canActivate() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    if (this.usuario.role.nombre === 'LVL_ARCHIVO') {
      this.router.navigateByUrl('/archivo/categorias');
      return false;
    }
    return true;
  }
}
