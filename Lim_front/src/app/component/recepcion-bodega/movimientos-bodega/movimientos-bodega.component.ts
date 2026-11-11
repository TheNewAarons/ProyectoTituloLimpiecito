import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { SolicitudBodegaService } from '../../../services/solicitud-bodega/solicitud-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { MovimientoBodega, TIPOS_MOVIMIENTO } from '../../../model/recepcion-bodega';
import { ProductoSolicitable } from '../../../model/solicitud-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: historial de entradas y salidas de bodega (movimientos_bodega) con filtros
@Component({
  selector: 'app-movimientos-bodega',
  templateUrl: './movimientos-bodega.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class MovimientosBodegaComponent implements OnInit {
  movimientos: MovimientoBodega[] = [];
  productos: ProductoSolicitable[] = [];
  tipos = TIPOS_MOVIMIENTO;
  productoId: number = null;
  tipo = '';
  desde = '';
  hasta = '';
  errorFechas = '';
  page = 1;
  pageSize = 50;
  total = 0;
  loading = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private solicitudService: SolicitudBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.solicitudService.obtenerProductos().subscribe(
      (r) => { this.productos = r.data; },
      () => { this.productos = []; }
    );
    this.cargar();
  }

  cargar() {
    this.errorFechas = this.desde && this.hasta && this.desde > this.hasta ? 'La fecha "desde" no puede ser posterior a "hasta"' : '';
    if (this.errorFechas) { return; }
    this.loading = true;
    this.recepcionService.movimientos({
      producto_id: this.productoId || undefined, tipo: this.tipo || undefined, desde: this.desde || undefined, hasta: this.hasta || undefined,
      page: this.page, limit: this.pageSize
    }).subscribe(
      (r) => {
        this.movimientos = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.movimientos = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  filtrar() {
    this.page = 1;
    this.cargar();
  }

  limpiar() {
    this.productoId = null;
    this.tipo = '';
    this.desde = '';
    this.hasta = '';
    this.filtrar();
  }

  nombreTipo(tipo: string): string {
    const t = this.tipos.filter((x) => x.valor === tipo)[0];
    return t ? t.nombre : tipo;
  }

  referencia(m: MovimientoBodega): string {
    if (m.referencia_tipo === 'ordenes_compra') { return 'Orden de compra N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'solicitudes_bodega') { return 'Solicitud N° ' + m.referencia_id; }
    return m.referencia_tipo ? m.referencia_tipo + ' ' + m.referencia_id : '—';
  }
}
