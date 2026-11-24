import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import * as html2pdf from 'html2pdf.js';
import { OrdenResumen, FILTROS_ORDEN, ETIQUETA_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

export interface FilaInformeCompra {
  proveedor: string;
  ordenes: number;
  pedidas: number;
  recibidas: number;
  pendientes: number;
  detalle: OrdenResumen[];
}

// html2pdf.js no trae tipos: solo lo que se usa aquí.
interface Html2PdfWorker {
  save(): Promise<void>;
  output(tipo: string): Promise<string>;
}

// Órdenes ANULADA no cuentan como compra.
export function agruparPorProveedor(ordenes: OrdenResumen[]): FilaInformeCompra[] {
  const filas: { [proveedor: string]: FilaInformeCompra } = {};
  ordenes.filter((o) => o.estado !== 'ANULADA').forEach((o) => {
    const nombre = o.proveedor || 'Sin proveedor';
    const f = filas[nombre] || (filas[nombre] = { proveedor: nombre, ordenes: 0, pedidas: 0, recibidas: 0, pendientes: 0, detalle: [] });
    f.detalle.push(o);
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
  seleccionada: FilaInformeCompra = null;
  generado: Date = null;
  nombreEstado = '';
  etiqueta = ETIQUETA_ORDEN;

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
        this.seleccionada = null; // el detalle abierto quedaría con datos del filtro anterior
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

  ver(f: FilaInformeCompra): void {
    this.seleccionada = f;
    this.generado = new Date();
    this.nombreEstado = this.filtros.filter((x) => x.valor === this.estado)[0].nombre;
    // espera a que Angular pinte el detalle para llevar la vista hasta él
    setTimeout(() => document.getElementById('informe-proveedor').scrollIntoView({ behavior: 'smooth' }));
  }

  cerrarDetalle(): void {
    this.seleccionada = null;
  }

  // PDF individual del proveedor (mismo mecanismo html2pdf que el formato de entrega).
  private pdf(): Html2PdfWorker {
    const nombre = this.seleccionada.proveedor.replace(/[^A-Za-z0-9]+/g, '_');
    return html2pdf().from(document.getElementById('informe-proveedor')).set({
      filename: 'Informe_compra_' + nombre + '.pdf',
      margin: [10, 10, 10, 10],
      html2canvas: {},
      jsPDF: { orientation: 'portrait', format: 'letter' }
    });
  }

  descargarPdf(): void {
    this.pdf().save();
  }

  // Abre el PDF en otra pestaña para imprimirlo solo a él (window.print imprimiría toda la pantalla).
  imprimirProveedor(): void {
    this.pdf().output('bloburl').then((url: string) => window.open(url));
  }
}
