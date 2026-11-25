import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { Proveedor, ProductoOc, LineaNuevaOc } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-03: OC manual en BORRADOR (proveedor + productos que elija el usuario), sin depender del stock
@Component({
  selector: 'app-orden-compra-nueva',
  templateUrl: './orden-compra-nueva.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class OrdenCompraNuevaComponent implements OnInit {
  proveedores: Proveedor[] = [];
  productos: ProductoOc[] = [];
  proveedorId: number = null;
  lineas: LineaNuevaOc[] = [];
  loading = false;
  enviando = false;

  constructor(
    private router: Router,
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.recepcionService.listarProveedores(1, 1, 100).subscribe(
      (r) => {
        this.proveedores = r.data;
        this.recepcionService.listarProductosActivos().subscribe(
          (p) => {
            this.productos = p.data;
            this.loading = false;
          },
          (error: HttpErrorResponse) => this.fallo(error)
        );
      },
      (error: HttpErrorResponse) => this.fallo(error)
    );
  }

  private fallo(error: HttpErrorResponse): void {
    this.loading = false;
    this.enviando = false;
    mostrarErrorBodega(error, this.alertas, this.loginService);
  }

  //SOLO PRODUCTOS CON EL PROVEEDOR ELEGIDO ASIGNADO (EL BACKEND EXIGE LA MISMA REGLA)
  get productosProveedor(): ProductoOc[] {
    return this.productos.filter((p) => p.proveedor_id === this.proveedorId);
  }

  //AL CAMBIAR DE PROVEEDOR SE PARTE CON UNA LINEA VACIA
  cambiarProveedor(): void {
    this.lineas = [];
    this.agregarLinea();
  }

  agregarLinea(): void {
    this.lineas.push({ producto_id: null, cantidad: 1, costo_unitario: null });
  }

  quitarLinea(indice: number): void {
    this.lineas.splice(indice, 1);
  }

  //PRECARGA EL COSTO DEL PRODUCTO (EDITABLE)
  elegirProducto(linea: LineaNuevaOc): void {
    const producto = this.producto(linea.producto_id);
    linea.costo_unitario = producto && producto.costo_unitario !== null ? Number(producto.costo_unitario) : null;
  }

  producto(id: number): ProductoOc {
    return this.productos.filter((p) => p.id === id)[0] || null;
  }

  //UN PRODUCTO NO PUEDE REPETIRSE: SE OCULTA EN LAS DEMAS LINEAS
  disponible(producto: ProductoOc, linea: LineaNuevaOc): boolean {
    return producto.id === linea.producto_id || !this.lineas.some((l) => l.producto_id === producto.id);
  }

  errorLinea(linea: LineaNuevaOc): string {
    if (!linea.producto_id) { return 'Seleccione un producto'; }
    if (!Number.isInteger(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || linea.cantidad === null) {
      return 'La cantidad debe ser un entero mayor a 0';
    }
    const costo = linea.costo_unitario;
    if (costo !== null && costo !== undefined && String(costo) !== '' && (!Number.isInteger(Number(costo)) || Number(costo) < 0)) {
      return 'El costo debe ser un entero mayor o igual a 0';
    }
    return '';
  }

  get total(): number {
    return this.lineas.reduce((t, l) => t + (Number(l.costo_unitario) || 0) * (Number(l.cantidad) || 0), 0);
  }

  puedeGuardar(): boolean {
    return !this.enviando && !!this.proveedorId && this.lineas.length > 0 && this.lineas.every((l) => !this.errorLinea(l));
  }

  guardar(): void {
    if (!this.puedeGuardar()) { return; }
    const items = this.lineas.map((l) => ({
      producto_id: l.producto_id,
      cantidad: Number(l.cantidad),
      costo_unitario: l.costo_unitario === null || l.costo_unitario === undefined || String(l.costo_unitario) === '' ? null : Number(l.costo_unitario)
    }));
    this.enviando = true;
    this.alertas.loading();
    this.recepcionService.crearOrden({ proveedor_id: this.proveedorId, items: items }).subscribe(
      (r) => {
        this.enviando = false;
        this.alertas.cerrarAlerta();
        this.alertas.alertaExitoMsj('Orden N° ' + r.data.id + ' creada en borrador', 'Revísala y envíala al proveedor.');
        this.router.navigate(['/bodega/ordenes-compra', r.data.id]);
      },
      (error: HttpErrorResponse) => {
        this.alertas.cerrarAlerta();
        this.fallo(error);
      }
    );
  }

  volver(): void {
    this.router.navigate(['/bodega/ordenes-compra']);
  }
}
