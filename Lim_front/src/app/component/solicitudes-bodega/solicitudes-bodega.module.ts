import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { SolicitudesBodegaRoutes } from './solicitudes-bodega.routing';
import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';
import { SolicitudDetalleComponent } from './solicitud-detalle/solicitud-detalle.component';
import { SolicitudNuevaComponent } from './solicitud-nueva/solicitud-nueva.component';

// RF-BOD-01: solicitudes de insumos/EPP (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(SolicitudesBodegaRoutes),
    FormsModule,
    NgbModule,
    NgSelectModule,
    MaterialModule,
    LoadingModule
  ],
  declarations: [SolicitudesListaComponent, SolicitudDetalleComponent, SolicitudNuevaComponent]
})
export class SolicitudesBodegaModule {}
