import { HttpErrorResponse } from '@angular/common/http';
import { AlertasService } from '../../services/alertas/alertas.service';
import { LoginService } from '../../services/login/login.service';

// Muestra el error { ok:false, error:{ message } } del backend; un 401 cierra sesión y vuelve al login.
// shortcut: reemplazar por el interceptor HTTP global cuando exista (tarea D de plataforma).
export function mostrarErrorBodega(error: HttpErrorResponse, alertas: AlertasService, login: LoginService): void {
  alertas.cerrarAlerta();
  if (error && error.status === 401) {
    alertas.alertaErrorMsj('Tu sesión expiró', 'Vuelve a iniciar sesión.');
    login.logout();
    return;
  }
  const mensaje = (error && error.error && error.error.error && error.error.error.message)
    ? error.error.error.message
    : 'Ha ocurrido un problema al procesar la solicitud.';
  alertas.alertaErrorMsj(error && error.status === 403 ? 'No tienes permiso' : 'No se pudo completar', mensaje);
}
