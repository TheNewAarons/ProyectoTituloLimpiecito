import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ArchivoRoutes } from './archivo.routing';
import { VistaCategoriasComponent } from './categorias/vista-categorias/vista-categorias.component';
import { VerCategoriaComponent } from './categorias/ver-categoria/ver-categoria.component';
import { CrearCategoriaComponent } from './categorias/crear-categoria/crear-categoria.component';
import { VistaDocumentosComponent } from './documentos/vista-documentos/vista-documentos.component';
import { VerDocumentoComponent } from './documentos/ver-documento/ver-documento.component';
import { CrearDocumentoComponent } from './documentos/crear-documento/crear-documento.component';
import { VistaAsociacionesComponent } from './asociacion/vista-asociaciones/vista-asociaciones.component';
import { CrearAsociacionComponent } from './asociacion/crear-asociacion/crear-asociacion.component';
import { VistaDescargasComponent } from './descargas/vista-descargas/vista-descargas.component';
import { VerDescargaComponent } from './descargas/ver-descarga/ver-descarga.component';

import { MaterialModule } from '../../app.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Ng2Rut } from 'ng2-rut';
import { VistaCategoriasInactivasComponent } from './categorias/vista-categorias-inactivas/vista-categorias-inactivas.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { SafePipe } from '../../pipe/safe.pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ArchivoRoutes),
    NgbModule,
    FormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    Ng2Rut
  ],
  declarations: [
    VistaCategoriasComponent,
    VerCategoriaComponent,
    CrearCategoriaComponent,
    VistaDocumentosComponent,
    VerDocumentoComponent,
    CrearDocumentoComponent,
    VistaAsociacionesComponent,
    CrearAsociacionComponent,
    VistaDescargasComponent,
    VerDescargaComponent,
    VistaCategoriasInactivasComponent,
    SafePipe
  ],
  providers: []
})
export class ArchivoModule {}
