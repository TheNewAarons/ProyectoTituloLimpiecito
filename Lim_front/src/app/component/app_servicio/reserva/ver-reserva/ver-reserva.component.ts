import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observacion } from 'src/app/model/Observacion';
import { ObservacionService } from 'src/app/services/observacion/observacion.service';
import { ReservaService } from 'src/app/services/reserva/reserva.service';
import { Location } from '@angular/common';

import { formatDate } from '@angular/common';

declare const $: any;
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { HttpClient } from '@angular/common/http';
import { LoginService } from 'src/app/services/login/login.service';
import { ejecutarAccionReserva } from '../acciones-reserva';

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
    private alertaService:AlertasService,
    private http: HttpClient, private loginService: LoginService // AUT-032
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

  // AUT-032 (RF-BI-05): aprobar / rechazar (con motivo) / finalizar con confirmación y resumen, errores en pantalla y
  // /api/v1/reservas (solo Admin, valida el estado, auditado, correo al cliente). Mismo flujo que los botones de las listas.
  //APROBAR RESERVA
  aprobar(id) {
    ejecutarAccionReserva(this.http, this.loginService, this.alertaService, 'aprobar', this.reserva, () => this.recargarTrasAccion());
  }

  //RECHAZAR RESERVA
  rechazar(id) {
    ejecutarAccionReserva(this.http, this.loginService, this.alertaService, 'rechazar', this.reserva, () => this.recargarTrasAccion());
  }

  //FINALIZAR RESERVA
  finalizar(id) {
    ejecutarAccionReserva(this.http, this.loginService, this.alertaService, 'finalizar', this.reserva, () => this.recargarTrasAccion());
  }

  // obtenerReserva alterna `loading`: se activa antes de recargar, igual que hacía el flujo anterior.
  private recargarTrasAccion() {
    this.loading = true;
    this.obtenerReserva(this.idReserva);
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
