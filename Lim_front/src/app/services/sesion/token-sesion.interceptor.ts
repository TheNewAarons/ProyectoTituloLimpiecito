import { Injectable, NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// RNF-SEC-02 (revisión de requerimientos: trazabilidad): las pantallas antiguas no envían la sesión y sus decisiones
// con dinero quedaban en la auditoría como "sistema / LEGACY_SIN_TOKEN". Este interceptor agrega el token a las
// llamadas a NUESTRO backend (environment.url) cuando hay sesión y la petición no trae uno propio.
// Lee localStorage directo (misma clave que LoginService.saveToken): inyectar LoginService crearía un ciclo con HttpClient.
export const CLAVE_TOKEN = 'usuarioToken';

export function esBackendPropio(url: string): boolean {
  return typeof url === 'string' && url.indexOf(environment.url + '/') === 0;
}

@Injectable()
export class TokenSesionInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!esBackendPropio(req.url) || req.headers.has('x-access-token')) {
      return next.handle(req);
    }
    let token: string = null;
    try { token = localStorage.getItem(CLAVE_TOKEN); } catch (e) { token = null; }
    return next.handle(token ? req.clone({ setHeaders: { 'x-access-token': token } }) : req);
  }
}

@NgModule({
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: TokenSesionInterceptor, multi: true }]
})
export class SesionHttpModule {}
