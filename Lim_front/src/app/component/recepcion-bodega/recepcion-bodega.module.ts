import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { RecepcionBodegaRoutes } from './recepcion-bodega.routing';
import { OrdenesCompraListaComponent } from './ordenes-compra-lista/ordenes-compra-lista.component';
import { OrdenRecepcionComponent } from './orden-recepcion/orden-recepcion.component';
import { MovimientosBodegaComponent } from './movimientos-bodega/movimientos-bodega.component';
import { FormatoEntregaComponent } from './formato-entrega/formato-entrega.component';

// RF-BOD-04: recepción de órdenes, movimientos y formato de entrega (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(RecepcionBodegaRoutes),
    FormsModule,
    NgbModule,
    NgSelectModule,
    MaterialModule,
    LoadingModule
  ],
  declarations: [OrdenesCompraListaComponent, OrdenRecepcionComponent, MovimientosBodegaComponent, FormatoEntregaComponent]
})
export class RecepcionBodegaModule {}
