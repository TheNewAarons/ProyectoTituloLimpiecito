import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MaterialModule } from '../../app.module';

import { CarpetaRoutes } from './carpeta.routing';
import { VistaClientesComponent } from './vista-clientes/vista-clientes.component';
import { CarpetaPadreComponent } from './carpeta-padre/carpeta-padre.component';
import { CarpetaHijoComponent } from './carpeta-hijo/carpeta-hijo.component';
import { CrearCarpetaComponent } from './crear-carpeta/crear-carpeta.component';
import { CrearDocumentoComponent } from './crear-documento/crear-documento.component';
import { VerDocumentoComponent } from './ver-documento/ver-documento.component';
import { CrearSubCarpetaComponent } from './crear-sub-carpeta/crear-sub-carpeta.component'

@NgModule({
    imports: [
      CommonModule,
      RouterModule.forChild(CarpetaRoutes),
      FormsModule,
      NgbModule,
      MaterialModule,
      ReactiveFormsModule
    ],
    declarations: [
    VistaClientesComponent,
    CarpetaPadreComponent,
    CarpetaHijoComponent,
    CrearCarpetaComponent,
    CrearDocumentoComponent,
    VerDocumentoComponent,
    CrearSubCarpetaComponent],
    providers: []
  })
  export class CarpetaModule {}