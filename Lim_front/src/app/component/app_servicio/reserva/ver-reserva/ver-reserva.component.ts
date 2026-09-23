import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observacion } from 'src/app/model/Observacion';
import { ObservacionService } from 'src/app/services/observacion/observacion.service';
import { ReservaService } from 'src/app/services/reserva/reserva.service';
import { Location } from '@angular/common';

import { formatDate } from '@angular/common';

declare const $: any;
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-ver-reserva',
  templateUrl: './ver-reserva.component.html',
  styleUrls: ['./ver-reserva.component.css']
})
export class VerReservaComponent implements OnInit {
  public idReserva;
  public reserva;
  public loading = true;
  public observacionModel: Observacion;

  constructor(
    private route: ActivatedRoute,private reservaService: ReservaService,
    private observacionService: ObservacionService,private location: Location,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID URL
  obtenerId() {
    this.idReserva = this.route.snapshot.paramMap.get('reservaId');
    this.observacionModel = new Observacion(null, '', formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-Es'), this.idReserva);
    this.obtenerReserva(this.idReserva);
  }

  //OBTENER RESERVA
  obtenerReserva(idReserva) {
    this.reservaService.obtenerReserva(idReserva).subscribe(
      (response: any) => {
        this.reserva = response.reserva;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //VOLVER ATRAS
  volver() {
    this.location.back();
  }

  //APROBAR RESERVA
  aprobar(id) {
    this.reservaService.aprobarReserva(id).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.alertaService.alertaExitoMsj('Reserva Aprobado Correctamante')
          this.obtenerReserva(this.idReserva);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //RECHAZAR RESERVA
  rechazar(id) {
    this.reservaService.rechazarReserva(id).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.alertaService.alertaExitoMsj('Reserva Rechazada Correctamante')
          this.obtenerReserva(this.idReserva);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //FINALIZAR RESERVA
  finalizar(id) {
    this.reservaService.finalizarReserva(id).subscribe(
      (response: any) => {
        if (response.filas > 0) {
          this.loading = !this.loading;
          this.alertaService.alertaExitoMsj('Reserva Finalizada Correctamante')
          this.obtenerReserva(this.idReserva);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //CREAR OBSERVACION
  crearObservacion(valid) {
    if (valid) {
      this.loading = !this.loading;
      this.observacionService.crearObservacion(this.observacionModel).subscribe(
        (response: any) => {
          if (response.observacion) {
            $('#createModal').modal('hide');
            this.observacionModel = new Observacion(null, '', formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-Es'), this.idReserva);
            this.alertaService.alertaExitoMsj('Observación Creada Correctamante')
            this.obtenerReserva(this.idReserva);
          } else {
            this.loading = !this.loading;
            this.alertaService.alertaError()
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
