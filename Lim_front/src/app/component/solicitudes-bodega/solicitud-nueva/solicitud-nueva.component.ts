import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { SolicitudBodegaService } from '../../../services/solicitud-bodega/solicitud-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { ProductoSolicitable, CentroPermitido } from '../../../model/solicitud-bodega';
import { mostrarErrorBodega } from '../solicitudes-bodega.errores';

interface LineaSolicitud {
  producto: ProductoSolicitable;
  cantidad: number;
}

// RF-BOD-01: formulario de nueva solicitud, usable desde el celular (RNF-UX-01)
@Component({
  selector: 'app-solicitud-nueva',
  templateUrl: './solicitud-nueva.component.html',
  styleUrls: ['../solicitudes-bodega.css']
})
export class SolicitudNuevaComponent implements OnInit {
  static readonly MAX_CANTIDAD = 100000;

  productos: ProductoSolicitable[] = [];
  centros: CentroPermitido[] = [];
  centroId: number = null;
  producto: ProductoSolicitable = null;
  cantidad: number = null;
  lineas: LineaSolicitud[] = [];
  observacion = '';
  errorLinea = '';
  loading = false;
  enviando = false;

  constructor(
    private solicitudService: SolicitudBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loading = true;
    forkJoin(this.solicitudService.obtenerProductos(), this.solicitudService.obtenerCentros()).subscribe(
      ([productos, centros]) => {
        this.productos = productos.data;
        this.centros = centros.data;
        // Regla 3: si hay un único centro, se preselecciona
        if (this.centros.length === 1) { this.centroId = this.centros[0].id; }
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  etiquetaCentro(c: CentroPermitido): string {
    return 'CC ' + c.numero_cc + (c.cliente ? ' · ' + c.cliente : '');
  }

  //AGREGAR PRODUCTO; SI YA ESTA, SE SUMA LA CANTIDAD (REGLA 4)
  agregar() {
    this.errorLinea = '';
    const cantidad = Number(this.cantidad);
    if (!this.producto) { this.errorLinea = 'Seleccione un producto'; return; }
    if (!Number.isInteger(cantidad) || cantidad < 1) { this.errorLinea = 'Ingrese una cantidad entera mayor a 0'; return; }
    const existente = this.lineas.find((l) => l.producto.id === this.producto.id);
    const total = (existente ? existente.cantidad : 0) + cantidad;
    if (total > SolicitudNuevaComponent.MAX_CANTIDAD) { this.errorLinea = 'La cantidad máxima por producto es ' + SolicitudNuevaComponent.MAX_CANTIDAD; return; }
    if (existente) {
      existente.cantidad = total;
    } else {
      this.lineas.push({ producto: this.producto, cantidad: cantidad });
    }
    this.producto = null;
    this.cantidad = null;
  }

  quitar(i: number) {
    this.lineas.splice(i, 1);
  }

  puedeEnviar(): boolean {
    return !!this.centroId && this.lineas.length > 0 && !this.enviando;
  }

  //ENVIAR SOLICITUD
  guardar() {
    if (!this.puedeEnviar()) { return; }
    this.enviando = true;
    this.alertas.loading();
    this.solicitudService.crear({
      centro_costo_id: this.centroId,
      items: this.lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
      observacion: this.observacion.trim() || undefined
    }).subscribe(
      (r) => {
        this.enviando = false;
        this.alertas.cerrarAlerta();
        this.alertas.alertaExitoMsj('Solicitud creada', 'Quedó en estado Pendiente.');
        this.router.navigate(['/bodega/solicitudes', r.data.id]);
      },
      (error: HttpErrorResponse) => {
        this.enviando = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  cancelar() {
    this.router.navigate(['/bodega/solicitudes']);
  }
}
