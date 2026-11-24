import { Injectable } from '@angular/core';
import { Router, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { LoginService } from '../login/login.service';
import { rolesDeUrl } from '../../sidebar/sidebar.component';

// Bloquea por URL las pantallas que el menú oculta al rol (misma config `roles` del sidebar).
// El backend sigue siendo quien valida: esto solo evita entrar a una pantalla que respondería 403.
@Injectable()
export class RolGuardService implements CanActivateChild {
  constructor(private loginService: LoginService, private router: Router) {}

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const roles = rolesDeUrl(state.url);
    if (!roles) return true;
    const usuario = this.loginService.obtenerDatosUsuario();
    if (usuario && usuario.role && roles.indexOf(usuario.role.nombre) !== -1) return true;
    this.router.navigateByUrl('/dashboard');
    return false;
  }
}
