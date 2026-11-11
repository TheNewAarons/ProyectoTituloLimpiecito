import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OrdenResumen, FILTROS_ORDEN, ETIQUETA_ORDEN, BADGE_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: órdenes de compra para confirmar recepción (por defecto, las que están por recibir)
@Component({
  selector: 'app-ordenes-compra-lista',
  templateUrl: './ordenes-compra-lista.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class OrdenesCompraListaComponent implements OnInit {
  ordenes: OrdenResumen[] = [];
  filtros = FILTROS_ORDEN;
  etiqueta = ETIQUETA_ORDEN;
  badge = BADGE_ORDEN;
  estado = FILTROS_ORDEN[0].valor;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.recepcionService.listarOrdenes(this.estado, this.page, this.pageSize).subscribe(
      (r) => {
        this.ordenes = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.ordenes = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  filtrar() {
    this.page = 1;
    this.cargar();
  }

  ver(id: number) {
    this.router.navigate(['/bodega/ordenes-compra', id]);
  }
}
