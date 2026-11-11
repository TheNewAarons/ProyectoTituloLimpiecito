import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../app.module';
import { EntregaSolicitudComponent } from './entrega-solicitud.component';

// RF-BOD-04: módulo sin rutas para usar <app-entrega-solicitud> dentro del detalle de la solicitud.
@NgModule({
  imports: [CommonModule, MaterialModule],
  declarations: [EntregaSolicitudComponent],
  exports: [EntregaSolicitudComponent]
})
export class EntregaSolicitudModule {}
