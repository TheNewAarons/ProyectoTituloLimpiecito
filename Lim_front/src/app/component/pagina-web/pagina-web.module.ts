import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PaginaWebRoutes } from './pagina-web.routing';


import { AnunciosComponent } from './anuncios/anuncios.component';


import { MaterialModule } from '../../app.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { CrearAnuncioComponent } from './crear-anuncio/crear-anuncio.component';
//import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';


@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(PaginaWebRoutes),
    NgbModule,
    FormsModule,
    NgSelectModule,
    //NgOptionHighlightModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
   
  ],
  declarations: [  
    AnunciosComponent, CrearAnuncioComponent,
  ],
  providers: []
})
export class PaginaWebModule {}
