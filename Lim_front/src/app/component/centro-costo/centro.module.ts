import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CentroCostoComponent } from './centro-costo.component';
import { VerCentroComponent } from './ver-centro/ver-centro.component';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { VerLiquidacionComponent } from './ver-liquidacion/ver-liquidacion.component';
import { EditarLiquidacionComponent } from './editar-liquidacion/editar-liquidacion.component';
import { PdfCentroComponent } from './pdf-centro/pdf-centro.component';
import { PdfListaInsumoComponent } from './pdf-lista-insumo/pdf-lista-insumo.component';

import { CentroRoutes } from './centro.routing';

import { MaterialModule } from '../../app.module';
import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Ng2Rut } from 'ng2-rut';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { LoadingModule } from 'src/app/loading/loading.module';
import { NuevaListaPdfComponent } from './nueva-lista-pdf/nueva-lista-pdf.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(CentroRoutes),
    FormsModule, ReactiveFormsModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    NgbModule,
    Ng2Rut,
    NgSelectModule,
    NgOptionHighlightModule,
    LoadingModule
  ],
  declarations: [
    CentroCostoComponent,
    VerCentroComponent,
    LiquidacionComponent,
    VerLiquidacionComponent,
    EditarLiquidacionComponent,
    PdfListaInsumoComponent,
    PdfCentroComponent,
    NuevaListaPdfComponent
  ]
})
export class CentroModule {}
