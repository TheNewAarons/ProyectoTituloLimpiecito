import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { DashboardBodegaService } from '../../../services/dashboard-bodega/dashboard-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { DashboardBodega, ProductoStock } from '../../../model/dashboard-bodega';
import { BADGE_ESTADO } from '../../../model/solicitud-bodega';
import { ETIQUETA_ORDEN, BADGE_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-05: home de bodega con los 4 bloques (una sola llamada al backend)
@Component({
  selector: 'app-dashboard-bodega',
  templateUrl: './dashboard-bodega.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class DashboardBodegaComponent implements OnInit {
  static readonly MAX_STOCK_MINIMO = 1000000;

  datos: DashboardBodega = null;
  duracionMs: number = null;
  error = false;
  // Paginación en cliente de la tabla de stock (guía §6); el backend ya trae los bajo mínimo primero.
  page = 1;
  pageSize = 10;
  badgeSolicitud = BADGE_ESTADO;
  etiquetaOrden = ETIQUETA_ORDEN;
  badgeOrden = BADGE_ORDEN;
  loading = false;

  constructor(
    private dashboardService: DashboardBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.error = false;
    this.dashboardService.obtener().subscribe(
      (r) => {
        this.datos = r.data;
        this.duracionMs = (r.meta as any).duracion_ms;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.error = true;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  ir(ruta: string, id?: number) {
    this.router.navigate(id ? [ruta, id] : [ruta]);
  }

  //EDITAR STOCK MINIMO (ENTERO >= 0; 0 = SIN ALERTA)
  editarMinimo(p: ProductoStock) {
    swal.fire({
      title: 'Stock mínimo',
      text: p.nombre + ' (stock actual: ' + p.stock + '). Use 0 para no alertar.',
      input: 'number',
      inputValue: String(p.stock_minimo),
      inputAttributes: { min: '0', step: '1', inputmode: 'numeric' },
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor) => {
        const n = Number(valor);
        return valor !== '' && Number.isInteger(n) && n >= 0 && n <= DashboardBodegaComponent.MAX_STOCK_MINIMO
          ? null : 'Ingrese un entero entre 0 y ' + DashboardBodegaComponent.MAX_STOCK_MINIMO;
      }
    }).then((resultado) => {
      if (resultado.dismiss || resultado.value === undefined) { return; }
      this.dashboardService.actualizarStockMinimo(p.id, Number(resultado.value)).subscribe(
        () => {
          this.alertas.showNotification('Stock mínimo actualizado');
          this.cargar();
        },
        (error: HttpErrorResponse) => mostrarErrorBodega(error, this.alertas, this.loginService)
      );
    });
  }
}
