import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { CatalogoWebRoutes } from './catalogo-web.routing';
import { CatalogoItemsComponent } from './catalogo-items/catalogo-items.component';

// RF-WEB-01: catálogo web (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(CatalogoWebRoutes),
    MaterialModule,
    LoadingModule
  ],
  declarations: [CatalogoItemsComponent]
})
export class CatalogoWebModule {}
