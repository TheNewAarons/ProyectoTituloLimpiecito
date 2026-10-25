import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { SolicitudBodegaService } from '../../../services/solicitud-bodega/solicitud-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { SolicitudBodega, AccionesSolicitud, BADGE_ESTADO, RespuestaBodega } from '../../../model/solicitud-bodega';
import { mostrarErrorBodega } from '../solicitudes-bodega.errores';

// RF-BOD-01: detalle con ítems; anulación según meta.acciones (lo decide el backend)
@Component({
  selector: 'app-solicitud-detalle',
  templateUrl: './solicitud-detalle.component.html'
})
export class SolicitudDetalleComponent implements OnInit {
  solicitud: SolicitudBodega = null;
  acciones: AccionesSolicitud = { puede_anular: false };
  badge = BADGE_ESTADO;
  loading = false;
  enviando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solicitudService: SolicitudBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.cargar();
  }

  //OBTENER LA SOLICITUD DE LA URL
  cargar() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.solicitudService.obtener(id).subscribe(
      (r) => {
        this.aplicar(r);
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  private aplicar(r: RespuestaBodega<SolicitudBodega>) {
    this.solicitud = r.data;
    this.acciones = r.meta.acciones || { puede_anular: false };
  }

  //ANULAR (NO SE BORRA; QUEDA EN AUDITORIA CON EL MOTIVO)
  anular() {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'La solicitud quedará anulada. Esta acción no se puede deshacer.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo (opcional)',
      inputAttributes: { maxlength: '500' },
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, ¡Anular!',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (resultado.dismiss || resultado.value === undefined) { return; }
      this.enviando = true;
      this.solicitudService.anular(this.solicitud.id, resultado.value || '').subscribe(
        (r) => {
          this.aplicar(r);
          this.enviando = false;
          this.alertas.alertaExitoMsj('Solicitud anulada');
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  volver() {
    this.router.navigate(['/bodega/solicitudes']);
  }
}
