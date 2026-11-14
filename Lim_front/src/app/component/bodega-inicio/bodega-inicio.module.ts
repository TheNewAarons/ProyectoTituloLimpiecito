import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { BodegaInicioRoutes } from './bodega-inicio.routing';
import { DashboardBodegaComponent } from './dashboard-bodega/dashboard-bodega.component';

// RF-BOD-05: home de bodega (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(BodegaInicioRoutes),
    NgbModule,
    MaterialModule,
    LoadingModule
  ],
  declarations: [DashboardBodegaComponent]
})
export class BodegaInicioModule {}
