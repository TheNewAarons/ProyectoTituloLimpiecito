import { Injectable } from '@angular/core';
import swal from 'sweetalert2';
declare const $: any;

@Injectable({
  providedIn: 'root'
})
export class AlertasService {

  constructor() { }
  //MOSTRAR MODAL LOADER 
  loading(){
    swal.fire({
      title:'Cargando...',
      allowOutsideClick:false,//Evitar cerrar el modal clikeando afuera
      allowEscapeKey:false, // Evita cerrar el modal con el "esc"
      didOpen: () => {
        swal.showLoading()
      }
    });
  }

  //OCULTAR MODAL
  cerrarAlerta(){
    swal.close();
  }

  //ALERTA DE EXITO CON MENSAJE
  alertaExitoMsj(mensaje,texto?){
    swal.fire({
      title: mensaje,
      text: texto,
      buttonsStyling: false,
      allowOutsideClick:false,//Para no cerrar el modelo con click al exterior
      allowEscapeKey:false, //Para no cerrar el modelo con esc
      customClass:{
        confirmButton: "btn btn-success",
      },
      confirmButtonText: 'Ok',
      icon: "success"
    });
  }

  //ALERTA DE ERROR GENERICO
  alertaError(){
    swal.fire({
      title: '¡Ha ocurrido un problema!',
      buttonsStyling: false,
      allowOutsideClick:false,//Para no cerrar el modelo con click al exterior
      allowEscapeKey:false, //Para no cerrar el modelo con esc
      customClass:{
        confirmButton: "btn btn-success",
      },
      confirmButtonText: 'Ok',
      icon: "error"
    });
  }
  //ALERTA DE ERROR CON MENSAJE
  alertaErrorMsj(mensaje,texto?){
    swal.fire({
      title: mensaje,
      text: texto,
      buttonsStyling: false,
      allowOutsideClick:false,//Para no cerrar el modelo con click al exterior
      allowEscapeKey:false, //Para no cerrar el modelo con esc
      customClass:{
        confirmButton: "btn btn-success",
      },
      confirmButtonText: 'Ok',
      icon: "error"
    });
  }
  showNotification(mensaje){
    $.notify({
      icon: 'notifications',
      message: mensaje
    }, {
        type: 'info',
        timer: 1000,
        placement: {
            from: 'top',
            align: 'center'
        },
        template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0} alert-with-icon" role="alert">' +
          '<button mat-raised-button type="button" aria-hidden="true" class="close" data-notify="dismiss">  <i class="material-icons">close</i></button>' +
          '<i class="material-icons" data-notify="icon">notifications</i> ' +
          '<span data-notify="title">{1}</span> ' +
          '<span data-notify="message">{2}</span>' +
          '<div class="progress" data-notify="progressbar">' +
            '<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
          '</div>' +
          '<a href="{3}" target="{4}" data-notify="url"></a>' +
        '</div>'
    });
  }
}
