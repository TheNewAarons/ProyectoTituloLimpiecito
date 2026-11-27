import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';
import { EgresoService } from '../../services/egreso/egreso.service';
import { AlertasService } from '../../services/alertas/alertas.service';

const mensajeDe = (e: HttpErrorResponse, porDefecto: string) =>
  (e && e.error && e.error.error && e.error.error.message) ? e.error.error.message : porDefecto;

/**
 * RNF-SEC-02 (retroalimentación): anular un ingreso o egreso es irreversible, así que pide
 * motivo -> código de 6 dígitos al correo -> confirmar (mismo flujo que activar/desactivar proveedor).
 * Si el código es incorrecto el diálogo no se cierra y muestra el error.
 */
export function anularConCodigo(o: {
  tipo: 'ingresos' | 'egresos';
  id: number;
  titulo: string;
  advertencia: string;
  exito: string;
  servicio: EgresoService;
  alertas: AlertasService;
  alTerminar: () => void;
}): void {
  // Primero se revisa si se puede anular: si no (caja cerrada, pago de liquidación, ya anulado) solo se avisa, sin pedir motivo.
  o.alertas.loading();
  o.servicio.verificarAnulable(o.tipo, o.id).subscribe(
    (r) => {
      o.alertas.cerrarAlerta();
      if (r.data && r.data.anulable) { pedirMotivo(o); } else { o.alertas.alertaErrorMsj('No se puede anular', (r.data && r.data.mensaje) || 'Este registro no se puede anular.'); }
    },
    (e: HttpErrorResponse) => { o.alertas.cerrarAlerta(); o.alertas.alertaErrorMsj('No se puede anular', mensajeDe(e, 'No se pudo verificar el registro.')); }
  );
}

function pedirMotivo(o: {
  tipo: 'ingresos' | 'egresos'; id: number; titulo: string; advertencia: string; exito: string;
  servicio: EgresoService; alertas: AlertasService; alTerminar: () => void;
}): void {
  swal.fire({
    title: o.titulo,
    text: o.advertencia + ' Ingresa el motivo; te enviaremos un código a tu correo para confirmar.',
    input: 'text',
    inputPlaceholder: 'Motivo',
    icon: 'warning',
    showCancelButton: true,
    buttonsStyling: false,
    allowOutsideClick: false,
    customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
    confirmButtonText: 'Enviar código',
    cancelButtonText: 'Cancelar',
    inputValidator: (valor: string) => {
      const largo = valor ? valor.trim().length : 0;
      return largo < 5 || largo > 500 ? 'El motivo debe tener entre 5 y 500 caracteres' : null;
    }
  }).then((r) => {
    if (!r.value) { return; }
    o.alertas.loading();
    o.servicio.pedirCodigoAnular(o.tipo, o.id, r.value.trim()).subscribe(
      (envio) => { o.alertas.cerrarAlerta(); pedirCodigo(o, envio.data.correo); },
      (e: HttpErrorResponse) => { o.alertas.cerrarAlerta(); o.alertas.alertaErrorMsj(mensajeDe(e, 'No se pudo enviar el código.')); }
    );
  });
}

function pedirCodigo(o: { tipo: 'ingresos' | 'egresos'; id: number; exito: string; servicio: EgresoService; alertas: AlertasService; alTerminar: () => void },
                     correo: string): void {
  swal.fire({
    title: 'Código de confirmación',
    text: 'Enviamos un código de 6 dígitos a ' + correo + '. Vence en 10 minutos.',
    input: 'text',
    inputPlaceholder: '000000',
    inputAttributes: { maxlength: '6', inputmode: 'numeric', autocomplete: 'one-time-code' },
    showCancelButton: true,
    buttonsStyling: false,
    customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
    confirmButtonText: 'Anular',
    cancelButtonText: 'Cancelar',
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !swal.isLoading(),
    inputValidator: (valor: string) => /^\d{6}$/.test((valor || '').trim()) ? null : 'Ingresa los 6 dígitos del código',
    preConfirm: (valor: string) =>
      o.servicio.anularConCodigo(o.tipo, o.id, valor.trim()).toPromise().catch((e: HttpErrorResponse) => {
        swal.showValidationMessage(mensajeDe(e, 'Ha ocurrido un problema al procesar la solicitud.'));
      })
  }).then((r) => {
    if (!r.value) { return; }
    o.alertas.alertaExitoMsj(o.exito);
    o.alTerminar();
  });
}
