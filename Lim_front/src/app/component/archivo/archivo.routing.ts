import { Routes } from '@angular/router';

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
import { VistaCategoriasInactivasComponent } from './categorias/vista-categorias-inactivas/vista-categorias-inactivas.component';

export const ArchivoRoutes: Routes = [
  {
    path: 'archivo/categorias',
    component: VistaCategoriasComponent
  },
  {
    path: 'archivo/categorias-inactivas',
    component: VistaCategoriasInactivasComponent
  },
  {
    path: 'archivo/ver-categoria/:idCategoria',
    component: VerCategoriaComponent
  },
  {
    path: 'archivo/crear-categoria',
    component: CrearCategoriaComponent
  },
  {
    path: 'archivo/documentos',
    component: VistaDocumentosComponent
  },
  {
    path: 'archivo/ver-documento/:idDocumento',
    component: VerDocumentoComponent
  },
  {
    path: 'archivo/crear-documento',
    component: CrearDocumentoComponent
  },
  {
    path: 'archivo/asociaciones',
    component: VistaAsociacionesComponent
  },
  {
    path: 'archivo/documento/crear-asociacion/:idDocumento',
    component: CrearAsociacionComponent
  },
  {
    path: 'archivo/descargas',
    component: VistaDescargasComponent
  },
  {
    path: 'archivo/ver-descarga/idDocumento',
    component: VerDescargaComponent
  }
];
