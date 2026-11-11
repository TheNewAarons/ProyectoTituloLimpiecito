import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../services/alertas/alertas.service';
import { LoginService } from '../../services/login/login.service';
import { SolicitudBodega } from '../../model/solicitud-bodega';
import { mostrarErrorBodega } from '../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: botones "Entregar" y "Formato de entrega" en el detalle de la solicitud (se inserta con una línea).
@Component({
  selector: 'app-entrega-solicitud',
  templateUrl: './entrega-solicitud.component.html',
  styleUrls: ['../solicitudes-bodega/solicitudes-bodega.css']
})
export class EntregaSolicitudComponent {
  @Input() solicitud: SolicitudBodega;
  @Output() entregada = new EventEmitter<SolicitudBodega>();
  enviando = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  get puedeEntregar(): boolean {
    return !!this.solicitud && this.solicitud.estado === 'LISTA_ENTREGA';
  }

  get tieneFormato(): boolean {
    return !!this.solicitud && (this.solicitud.estado === 'LISTA_ENTREGA' || this.solicitud.estado === 'ENTREGADA');
  }

  //ENTREGAR: CONFIRMA, REGISTRA EL CONSUMO EN EL CENTRO DE COSTO Y ABRE EL FORMATO
  entregar() {
    swal.fire({
      title: '¿Entregar la solicitud?',
      text: 'Se registrará el consumo en el centro de costo y la solicitud quedará Entregada. El stock no se vuelve a descontar.',
      icon: 'question',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Entregar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.enviando = true;
      this.recepcionService.entregar(this.solicitud.id).subscribe(
        (r) => {
          this.enviando = false;
          this.entregada.emit(r.data);
          this.alertas.showNotification('Solicitud entregada');
          this.verFormato();
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  verFormato() {
    this.router.navigate(['/bodega/solicitudes', this.solicitud.id, 'formato']);
  }
}
