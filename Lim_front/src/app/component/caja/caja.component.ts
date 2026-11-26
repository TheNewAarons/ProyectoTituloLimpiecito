import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

//SERVICIOS
import { CajaService } from './../../services/caja/caja.service';
import { LoginService } from './../../services/login/login.service';

//MODELOS
import { Caja } from '../../model/caja';
import { CajaHistorialItem } from '../../model/caja-resumen';

import { MatDialog } from '@angular/material';
import { HistorialDialogoComponent } from '../historial/historial-dialogo.component';
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** Fila de la tabla: historial del mes + id de la caja legacy (para Ver/Movimientos/Cerrar). */
export interface FilaCaja extends CajaHistorialItem {
  id: number;
}

// El historial v1 admite como máximo 120 meses por consulta.
const MAX_MESES_HISTORIAL = 120;

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.css']
})
export class CajaComponent implements OnInit {

  public caja: Caja;
  public caja_actual;
  public usuario;

  public filas: FilaCaja[] = [];
  public anios: number[] = [];
  public anioSeleccionado: number = null;
  public filtroEstado: 'TODAS' | 'ABIERTA' | 'CERRADA' = 'TODAS';
  public readonly periodoHoy = formatDate(new Date(), 'yyyy-MM', 'en-US');

  constructor(
    private cajaService: CajaService, private loginService: LoginService,
    private alertaService:AlertasService, private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.caja = new Caja(1, null, null, null, null, null, null, null, 1, null);
    this.obtenerCajaActivaYCajas()
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER CAJA ACTIVA, CAJAS Y SU HISTORIAL (saldos encadenados)
  obtenerCajaActivaYCajas(): void {
    this.alertaService.loading()
    forkJoin([this.cajaService.obtenerSoloCajas(), this.cajaService.obtenerCajaActiva()]).pipe(
      switchMap((response: any) => {
        this.caja_actual = response[1].caja
        const cajas: Caja[] = response[0].cajas || []
        const idPorPeriodo: { [periodo: string]: number } = {}
        cajas.forEach((c) => { idPorPeriodo[this.periodoDe(c)] = c.id })
        const periodos = Object.keys(idPorPeriodo).filter((p) => !!p).sort()
        if (!periodos.length) {
          return of({ idPorPeriodo: idPorPeriodo, items: [] as CajaHistorialItem[] })
        }
        const hasta = periodos[periodos.length - 1] > this.periodoHoy ? periodos[periodos.length - 1] : this.periodoHoy
        const desde = periodos[0] > this.desplazar(hasta, -(MAX_MESES_HISTORIAL - 1)) ? periodos[0] : this.desplazar(hasta, -(MAX_MESES_HISTORIAL - 1))
        return this.cajaService.obtenerHistorial(desde, hasta).pipe(
          map((r) => ({ idPorPeriodo: idPorPeriodo, items: r.data || [] }))
        )
      })
    ).subscribe(
      (r) => {
        this.alertaService.cerrarAlerta()
        this.filas = r.items
          .filter((item) => r.idPorPeriodo[item.periodo] != null)
          .map((item) => Object.assign({ id: r.idPorPeriodo[item.periodo] }, item))
          .reverse()
        this.anios = this.filas.map((f) => Number(f.periodo.slice(0, 4)))
          .filter((a, i, lista) => lista.indexOf(a) === i)
        if (this.anios.indexOf(this.anioSeleccionado) === -1) {
          this.anioSeleccionado = this.anios.length ? this.anios[0] : null
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }

  /** Filas del año y estado elegidos, más recientes primero. */
  get filasVisibles(): FilaCaja[] {
    return this.filas.filter((f) =>
      Number(f.periodo.slice(0, 4)) === this.anioSeleccionado &&
      (this.filtroEstado === 'TODAS' || f.estado === this.filtroEstado))
  }

  get filaActual(): FilaCaja {
    return this.filas.length ? this.filas[0] : null
  }

  get mesesSinCerrar(): number {
    return this.filas.filter((f) => f.estado === 'ABIERTA').length
  }

  totalAnio(campo: 'ingresos' | 'egresos'): number {
    return this.filas
      .filter((f) => Number(f.periodo.slice(0, 4)) === this.anioSeleccionado)
      .reduce((suma, f) => suma + Number(f[campo] || 0), 0)
  }

  get resultadoAnio(): number {
    return this.totalAnio('ingresos') - this.totalAnio('egresos')
  }

  /** 'YYYY-MM' → fecha del día 1 (para el pipe date). */
  fechaPeriodo(periodo: string): Date {
    return new Date(Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7)) - 1, 1)
  }

  private periodoDe(c: Caja): string {
    const conPeriodo = c as Caja & { periodo?: string }
    return conPeriodo.periodo || (c.fecha_inicio ? String(c.fecha_inicio).slice(0, 7) : '')
  }

  private desplazar(periodo: string, meses: number): string {
    const total = Number(periodo.slice(0, 4)) * 12 + Number(periodo.slice(5, 7)) - 1 + meses
    const mes = (total % 12) + 1
    return Math.floor(total / 12) + '-' + (mes < 10 ? '0' : '') + mes
  }

  //HISTORIAL COMPLETO DE LA CAJA (caja + movimientos)
  verHistorial(fila: FilaCaja): void {
    this.dialog.open(HistorialDialogoComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: { cajaId: fila.id, titulo: 'Caja ' + fila.periodo }
    });
  }

  //CREAR CAJA
  crearCaja() {
    this.alertaService.loading()
    this.caja.fecha_inicio = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
    this.caja.usuarioId = this.usuario.id;
    this.cajaService.crearCaja(this.caja).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.caja = new Caja(1, null, null, null, null, null, null, null, 1, 1);
        this.obtenerCajaActivaYCajas()
        this.alertaService.alertaExitoMsj('Caja Creada Correctamente')
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //CERRAR CAJA
  cerrarCaja(idCaja) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Estas por cerrar esta caja',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Cerrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        let fecha_cierre = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
        this.cajaService.cerrarCaja(fecha_cierre, idCaja).subscribe(
          (response: any) => {
            if (response.cerrar) {
              this.alertaService.cerrarAlerta()
              this.obtenerCajaActivaYCajas()
              this.alertaService.alertaExitoMsj(response.mensaje)
            } else {
              // cierre rechazado (ej. centros de costo abiertos): no es un éxito
              this.alertaService.cerrarAlerta()
              this.alertaService.alertaErrorMsj(response.mensaje)
            }
          },
          (error: HttpErrorResponse) => {
            this.mostrarErrorCierre(error);
          }
        );
      }
    });
  }

  //MOSTRAR MENSAJE DE ERROR AL CERRAR CAJA (ej. 401/403 POR TOKEN AUSENTE O SIN ROL ADMIN)
  private mostrarErrorCierre(error: HttpErrorResponse): void {
    this.alertaService.cerrarAlerta();
    if (error.status === 401 || error.status === 403) {
      this.alertaService.alertaErrorMsj('No tienes permisos para cerrar esta caja. Inicia sesión como Administrador.');
      return;
    }
    const mensaje = (error && error.error && error.error.error && error.error.error.message)
      ? error.error.error.message
      : 'Ha ocurrido un problema al cerrar la caja.';
    this.alertaService.alertaErrorMsj(mensaje);
  }
}
