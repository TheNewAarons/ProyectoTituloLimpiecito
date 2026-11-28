import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { MatTooltipModule } from '@angular/material';
import swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { LoginService } from '../../../services/login/login.service';
import { AlertasService } from '../../../services/alertas/alertas.service';

export type AccionReserva = 'aprobar' | 'rechazar' | 'finalizar';

const esc = (s: any) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
const hhmm = (t: string) => (t ? String(t).slice(0, 5) : '');
function fechaCorta(v: any): string {
  const d = new Date(v);
  // fecha_reserva guarda el día en UTC (como lo leen las consultas): en hora de Chile una reserva a las 00:00 saldría un día antes.
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}

const TEXTOS: { [a: string]: { titulo: string; boton: string; clase: string; icono: 'question' | 'warning'; aviso: string; exito: string } } = {
  aprobar: { titulo: '¿Aprobar la reserva?', boton: 'Sí, aprobar', clase: 'btn btn-success', icono: 'question',
    aviso: 'Se enviará un correo de confirmación al cliente.', exito: 'Reserva aprobada' },
  rechazar: { titulo: '¿Rechazar la reserva?', boton: 'Rechazar y avisar', clase: 'btn btn-danger', icono: 'warning',
    aviso: 'Indica el motivo: se enviará por correo al cliente y queda en el historial.', exito: 'Reserva rechazada' },
  finalizar: { titulo: '¿Marcar el servicio como realizado?', boton: 'Sí, finalizar', clase: 'btn btn-info', icono: 'question',
    aviso: 'Quedará como finalizada y pagada, y se enviará un correo de agradecimiento al cliente.', exito: 'Reserva finalizada' }
};

/**
 * RF-BI-05 (AUT-032): aprobar / rechazar / finalizar una reserva con confirmación (resumen), motivo obligatorio al rechazar,
 * errores en pantalla y POST /api/v1/reservas/:id/<accion> (solo Admin, valida estado, auditado, correo al cliente).
 * La usan los botones de las listas (AccionesReservaComponent) y la pantalla Ver reserva.
 */
export function ejecutarAccionReserva(http: HttpClient, loginService: LoginService, alertas: AlertasService,
                                      accion: AccionReserva, reserva: any, alTerminar: () => void): void {
  const t = TEXTOS[accion];
  const servicio = reserva && reserva.servicio ? reserva.servicio.nombre : '';
  const cliente = reserva && reserva.usuario_app ? reserva.usuario_app.nombre : '';
  const resumen = '<div style="text-align:left;line-height:1.7">' +
    '<b>Reserva N° ' + esc(reserva.orden) + '</b><br>' + esc(servicio) + '<br>' +
    esc(fechaCorta(reserva.fecha_reserva)) + ', ' + esc(hhmm(reserva.hora_inicio)) + ' – ' + esc(hhmm(reserva.hora_fin)) + ' hrs' +
    (cliente ? '<br>Cliente: ' + esc(cliente) : '') + '</div><p style="margin-top:12px">' + esc(t.aviso) + '</p>';
  const url = environment.url + '/api/v1/reservas/' + reserva.id + '/' + accion;
  const headers = new HttpHeaders({ 'x-access-token': loginService.getToken() || '' });
  const mensajeError = (e: HttpErrorResponse) => (e && e.error && e.error.error && e.error.error.message) || 'No se pudo completar la acción.';

  swal.fire({
    title: t.titulo,
    html: resumen,
    icon: t.icono,
    input: accion === 'rechazar' ? 'textarea' : undefined,
    inputPlaceholder: accion === 'rechazar' ? 'Ej.: No hay equipo disponible ese día. Te invitamos a elegir otro horario.' : undefined,
    inputAttributes: accion === 'rechazar' ? { maxlength: '300', 'aria-label': 'Motivo del rechazo' } : undefined,
    inputValidator: accion === 'rechazar' ? (v: string) => {
      const n = v ? v.trim().length : 0;
      return n < 5 || n > 300 ? 'El motivo debe tener entre 5 y 300 caracteres.' : null;
    } : undefined,
    showCancelButton: true,
    buttonsStyling: false,
    customClass: { confirmButton: t.clase, cancelButton: 'btn btn-default ml-2' },
    confirmButtonText: t.boton,
    cancelButtonText: 'Cancelar',
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !swal.isLoading(),
    preConfirm: (motivo: string) =>
      http.post<any>(url, accion === 'rechazar' ? { motivo: (motivo || '').trim() } : {}, { headers: headers }).toPromise()
        .catch((e: HttpErrorResponse) => { swal.showValidationMessage(esc(mensajeError(e))); })
  }).then((r: any) => {
    if (!r.value) { return; }
    const d = r.value.data || {};
    alertas.showNotification(t.exito + ' (N° ' + d.orden + ')' + (d.correo_enviado ? ' · correo enviado al cliente' : ' · no se pudo enviar el correo'),
      d.correo_enviado ? 'success' : 'warning');
    alTerminar();
  });
}

// Botones de la fila: en proceso -> Aprobar / Rechazar; aprobada -> Finalizar / Rechazar.
@Component({
  selector: 'app-acciones-reserva',
  template: `
    <ng-container *ngIf="reserva">
      <button *ngIf="reserva.estado == 3" mat-raised-button type="button" class="btn btn-success btn-round" matTooltip="Aprobar (envía correo de confirmación)"
              (click)="hacer('aprobar')" [attr.aria-label]="'Aprobar reserva ' + reserva.orden"><i class="material-icons">check</i></button>
      <button *ngIf="reserva.estado == 2" mat-raised-button type="button" class="btn btn-info btn-round" matTooltip="Finalizar (servicio realizado)"
              (click)="hacer('finalizar')" [attr.aria-label]="'Finalizar reserva ' + reserva.orden"><i class="material-icons">task_alt</i></button>
      <button *ngIf="reserva.estado == 3 || reserva.estado == 2" mat-raised-button type="button" class="btn btn-danger btn-round" matTooltip="Rechazar (pide motivo y avisa al cliente)"
              (click)="hacer('rechazar')" [attr.aria-label]="'Rechazar reserva ' + reserva.orden"><i class="material-icons">close</i></button>
    </ng-container>
  `
})
export class AccionesReservaComponent {
  @Input() reserva: any;
  @Output() cambio = new EventEmitter<void>();

  constructor(private http: HttpClient, private loginService: LoginService, private alertas: AlertasService) {}

  hacer(accion: AccionReserva): void {
    ejecutarAccionReserva(this.http, this.loginService, this.alertas, accion, this.reserva, () => this.cambio.emit());
  }
}

@NgModule({
  imports: [CommonModule, MatTooltipModule],
  declarations: [AccionesReservaComponent],
  exports: [AccionesReservaComponent]
})
export class AccionesReservaModule {}
