import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ColaboradorRoutes } from './colaborador.routing';
import { TrabajadorComponent } from './trabajador/trabajador.component';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { PdfLiquidacionComponent } from './pdf-liquidacion/pdf-liquidacion.component';
import { MaterialModule } from '../../app.module';

import { CrearTrabajadorComponent } from './crear-trabajador/crear-trabajador.component';
import { EditarTrabajadorComponent } from './editar-trabajador/editar-trabajador.component';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';
import { Ng2Rut } from 'ng2-rut';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { VerTrabajadorComponent } from './ver-trabajador/ver-trabajador.component';
import { CrearAccesoTrabajadorComponent } from './crear-acceso-trabajador/crear-acceso-trabajador.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ColaboradorRoutes),
    NgbModule,
    FormsModule,
    //NgSelectModule,
    //NgOptionHighlightModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    Ng2Rut
  ],
  declarations: [
    TrabajadorComponent,
    LiquidacionComponent,
    PdfLiquidacionComponent,
    CrearTrabajadorComponent,
    EditarTrabajadorComponent,
    VerTrabajadorComponent,
    CrearAccesoTrabajadorComponent
  ]
})
export class ColaboradorModule {}
