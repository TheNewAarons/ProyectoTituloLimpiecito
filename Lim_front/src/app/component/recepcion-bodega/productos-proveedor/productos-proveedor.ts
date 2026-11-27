import { Component, Inject, Input, NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogModule, MatDialogRef, MatTooltipModule, MAT_DIALOG_DATA } from '@angular/material';
import swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { Proveedor, ProductoOc } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';
import { PaginacionModule, nuevaPaginacion } from '../../paginacion/paginacion';

// Retroalimentación: asignar productos a un proveedor desde la pantalla (antes solo existía el PATCH en la API).
// "Generar Órdenes" solo pide los productos que tienen proveedor; un producto tiene un único proveedor.
@Component({
  selector: 'app-productos-proveedor-dialogo',
  template: `
    <h2 mat-dialog-title>Productos de {{ data.nombre }}</h2>
    <p class="text-muted mb-2">"Generar Órdenes" solo pide a este proveedor los productos de esta lista.</p>
    <div mat-dialog-content>
      <p *ngIf="cargando" class="text-muted">Cargando productos…</p>
      <ng-container *ngIf="!cargando">
        <div class="row align-items-end" *ngIf="data.activo">
          <div class="col-12 col-md-5">
            <label class="d-block" for="pp-buscar">Buscar producto</label>
            <input id="pp-buscar" class="form-control" [(ngModel)]="filtro" placeholder="Nombre del producto" maxlength="60">
          </div>
          <div class="col-12 col-md-5">
            <label class="d-block" for="pp-producto">Producto a agregar</label>
            <select id="pp-producto" class="form-control" [(ngModel)]="productoId">
              <option [ngValue]="null">— Elija un producto ({{ candidatos().length }}) —</option>
              <option *ngFor="let p of candidatos()" [ngValue]="p.id">{{ p.nombre }}{{ p.proveedor_id ? ' (cambia de proveedor)' : '' }}</option>
            </select>
          </div>
          <div class="col-12 col-md-2">
            <button mat-raised-button type="button" class="btn btn-success btn-block" (click)="agregar()" [disabled]="!productoId || enviando">Agregar</button>
          </div>
        </div>
        <p class="text-warning mt-2" *ngIf="!data.activo">El proveedor está inactivo: actívelo para asignarle productos.</p>
        <div class="table-responsive mt-3">
          <table class="table">
            <thead class="text-primary"><tr><th>Producto</th><th class="text-right">Stock</th><th class="text-right">Acción</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of asignados() | paginar: pag">
                <td>{{ p.nombre }}</td>
                <td class="text-right">{{ p.stock }}</td>
                <td class="td-actions text-right">
                  <button mat-raised-button type="button" class="btn btn-danger btn-round" matTooltip="Quitar de este proveedor" (click)="quitar(p)" [disabled]="enviando">
                    <i class="material-icons">remove_circle_outline</i>
                  </button>
                </td>
              </tr>
              <tr *ngIf="asignados().length === 0"><td colspan="3" class="text-center text-muted">Este proveedor aún no tiene productos asignados.</td></tr>
            </tbody>
          </table>
          <app-paginacion [estado]="pag" [total]="asignados().length"></app-paginacion>
        </div>
      </ng-container>
    </div>
    <div mat-dialog-actions class="justify-content-end">
      <button mat-raised-button type="button" class="btn btn-danger btn-sm" (click)="dialogRef.close()">Cerrar</button>
    </div>
  `
})
export class ProductosProveedorDialogoComponent implements OnInit {
  productos: ProductoOc[] = [];
  cargando = true;
  enviando = false;
  filtro = '';
  productoId: number = null;
  pag = nuevaPaginacion();
  private url = environment.url + '/api/v1/bodega';

  constructor(
    public dialogRef: MatDialogRef<ProductosProveedorDialogoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Proveedor,
    private http: HttpClient,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando = true;
    this.http.get<{ data: ProductoOc[] }>(this.url + '/productos').subscribe(
      (r) => { this.productos = r.data || []; this.cargando = false; },
      (e: HttpErrorResponse) => { this.cargando = false; mostrarErrorBodega(e, this.alertas, this.loginService); }
    );
  }

  asignados(): ProductoOc[] {
    return this.productos.filter((p) => p.proveedor_id === this.data.id);
  }

  candidatos(): ProductoOc[] {
    const f = this.filtro.trim().toLowerCase();
    return this.productos.filter((p) => p.proveedor_id !== this.data.id && (!f || p.nombre.toLowerCase().indexOf(f) !== -1));
  }

  agregar() {
    const p = this.productos.find((x) => x.id === this.productoId);
    if (!p) return;
    if (!p.proveedor_id) { this.asignar(p, this.data.id); return; }
    swal.fire({
      title: '¿Cambiar de proveedor?',
      text: '"' + p.nombre + '" ya tiene otro proveedor. Desde ahora se le pedirá a ' + this.data.nombre + '.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Cambiar', cancelButtonText: 'Cancelar'
    }).then((r) => { if (r.value) this.asignar(p, this.data.id); });
  }

  quitar(p: ProductoOc) {
    swal.fire({
      titleText: '¿Quitar "' + p.nombre + '"?', // titleText: el nombre se muestra como texto, no como HTML
      text: 'Quedará sin proveedor y "Generar Órdenes" no lo pedirá hasta asignarle otro.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar'
    }).then((r) => { if (r.value) this.asignar(p, null); });
  }

  private asignar(p: ProductoOc, proveedorId: number | null) {
    this.enviando = true;
    this.http.patch(this.url + '/productos/' + p.id + '/proveedor', { proveedor_id: proveedorId }).subscribe(
      () => {
        this.enviando = false;
        p.proveedor_id = proveedorId;
        this.productoId = null;
        this.alertas.showNotification(proveedorId ? 'Producto asignado a ' + this.data.nombre : 'Producto quitado del proveedor');
      },
      (e: HttpErrorResponse) => { this.enviando = false; mostrarErrorBodega(e, this.alertas, this.loginService); }
    );
  }
}

// Botón de la fila de Proveedores: abre el modal de productos de ese proveedor.
@Component({
  selector: 'app-productos-proveedor',
  template: `
    <button mat-raised-button type="button" class="btn btn-info btn-round" matTooltip="Productos de este proveedor" (click)="abrir()">
      <i class="material-icons">category</i>
    </button>
  `
})
export class ProductosProveedorComponent {
  @Input() proveedor: Proveedor;

  constructor(private dialog: MatDialog) {}

  abrir(): void {
    this.dialog.open(ProductosProveedorDialogoComponent, { width: '800px', maxWidth: '95vw', data: this.proveedor });
  }
}

@NgModule({
  imports: [CommonModule, FormsModule, MatDialogModule, MatTooltipModule, PaginacionModule],
  declarations: [ProductosProveedorDialogoComponent, ProductosProveedorComponent],
  entryComponents: [ProductosProveedorDialogoComponent],
  exports: [ProductosProveedorComponent]
})
export class ProductosProveedorModule {}
