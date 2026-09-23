import { Routes } from '@angular/router';

import { AnunciosComponent } from './anuncios/anuncios.component';
import { CrearAnuncioComponent } from './crear-anuncio/crear-anuncio.component';

export const PaginaWebRoutes: Routes = [
  {
    path: 'pagina_web/anuncios',
    component: AnunciosComponent
  },
  {
    path: 'pagina_web/crear-anuncio',
    component: CrearAnuncioComponent
  },
  
];
