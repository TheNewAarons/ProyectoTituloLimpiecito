import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OrdenResumen, FILTROS_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

export interface FilaInformeCompra {
  proveedor: string;
  ordenes: number;
  pedidas: number;
  recibidas: number;
  pendientes: number;
}

// Órdenes ANULADA no cuentan como compra.
export function agruparPorProveedor(ordenes: OrdenResumen[]): FilaInformeCompra[] {
  const filas: { [proveedor: string]: FilaInformeCompra } = {};
  ordenes.filter((o) => o.estado !== 'ANULADA').forEach((o) => {
    const nombre = o.proveedor || 'Sin proveedor';
    const f = filas[nombre] || (filas[nombre] = { proveedor: nombre, ordenes: 0, pedidas: 0, recibidas: 0, pendientes: 0 });
    f.ordenes++;
    f.pedidas += o.unidades_pedidas;
    f.pendientes += o.unidades_pendientes;
    f.recibidas += o.unidades_pedidas - o.unidades_pendientes;
  });
  return Object.keys(filas).map((k) => filas[k]).sort((a, b) => b.pedidas - a.pedidas);
}

// RF-BOD-03 (TEMPORAL): informe de compra por proveedor armado en el navegador.
// shortcut: agrega solo las MAX_ORDENES órdenes más recientes (límite del endpoint), sin montos ni rango de fechas;
// reemplazar por un endpoint de informe en el backend cuando el requerimiento quede definido en el spec.
@Component({
  selector: 'app-informe-compra',
  templateUrl: './informe-compra.component.html'
})
export class InformeCompraComponent implements OnInit {
  readonly MAX_ORDENES = 200;
  filtros = FILTROS_ORDEN;
  estado = '';
  filas: FilaInformeCompra[] = [];
  totalOrdenes = 0;
  truncado = false;
  loading = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.recepcionService.listarOrdenes(this.estado, 1, this.MAX_ORDENES).subscribe(
      (r) => {
        this.filas = agruparPorProveedor(r.data);
        this.totalOrdenes = r.meta.total || 0;
        this.truncado = this.totalOrdenes > this.MAX_ORDENES;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.filas = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  imprimir(): void {
    window.print();
  }
}
