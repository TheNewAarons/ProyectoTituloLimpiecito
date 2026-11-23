import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { KardexProducto, MovimientoBodega, TIPOS_MOVIMIENTO } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-06: kardex valorizado de un producto (costo promedio ponderado, montos CLP)
@Component({
  selector: 'app-kardex-producto',
  templateUrl: './kardex-producto.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class KardexProductoComponent implements OnInit {
  kardex: KardexProducto = null;
  productoId: number;
  page = 1;
  pageSize = 50;
  total = 0;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.recepcionService.kardex(this.productoId, this.page, this.pageSize).subscribe(
      (r) => {
        this.kardex = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  nombreTipo(tipo: string): string {
    const t = TIPOS_MOVIMIENTO.filter((x) => x.valor === tipo)[0];
    return t ? t.nombre : tipo;
  }

  referencia(m: MovimientoBodega): string {
    if (m.referencia_tipo === 'ordenes_compra') { return 'Orden de compra N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'solicitudes_bodega') { return 'Solicitud N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'recepciones_compra') { return 'Recepción N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'inventario_conteos') { return 'Conteo físico N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'stock_rapidos') { return 'Stock rápido N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'lista_insumos') { return 'Lista de insumos N° ' + m.referencia_id; }
    if (m.referencia_tipo === 'migracion_RF-BOD-06') { return 'Carga inicial del kardex'; }
    return m.referencia_tipo ? m.referencia_tipo + (m.referencia_id ? ' ' + m.referencia_id : '') : '—';
  }

  volver(): void {
    this.router.navigate(['/bodega/movimientos']);
  }
}
