import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { RecepcionBodegaRoutes } from './recepcion-bodega.routing';
import { ProductosProveedorModule } from './productos-proveedor/productos-proveedor';
import { OrdenesCompraListaComponent } from './ordenes-compra-lista/ordenes-compra-lista.component';
import { OrdenRecepcionComponent } from './orden-recepcion/orden-recepcion.component';
import { MovimientosBodegaComponent } from './movimientos-bodega/movimientos-bodega.component';
import { FormatoEntregaComponent } from './formato-entrega/formato-entrega.component';
import { KardexProductoComponent } from './kardex-producto/kardex-producto.component';
import { ConteosListaComponent } from './conteos-lista/conteos-lista.component';
import { ConteoDetalleComponent } from './conteo-detalle/conteo-detalle.component';
import { ProveedoresListaComponent } from './proveedores-lista/proveedores-lista.component';
import { InformeCompraComponent } from './informe-compra/informe-compra.component';
import { OrdenCompraNuevaComponent } from './orden-compra-nueva/orden-compra-nueva.component';
import { PaginacionModule } from '../paginacion/paginacion';
import { HistorialModule } from '../historial/historial.module';

// RF-BOD-04: recepción de órdenes, movimientos y formato de entrega (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    PaginacionModule, // AUT-024: tablas paginadas
    ProductosProveedorModule, // retroalimentación: asignar productos a un proveedor
    RouterModule.forChild(RecepcionBodegaRoutes),
    FormsModule,
    NgbModule,
    NgSelectModule,
    MaterialModule,
    LoadingModule,
    HistorialModule
  ],
  declarations: [
    OrdenesCompraListaComponent, OrdenRecepcionComponent, MovimientosBodegaComponent, FormatoEntregaComponent, KardexProductoComponent,
    ConteosListaComponent, ConteoDetalleComponent, ProveedoresListaComponent, InformeCompraComponent, OrdenCompraNuevaComponent
  ]
})
export class RecepcionBodegaModule {}
