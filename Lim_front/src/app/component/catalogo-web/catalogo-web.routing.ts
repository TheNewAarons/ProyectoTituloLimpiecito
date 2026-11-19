import { Routes } from '@angular/router';

import { CatalogoItemsComponent } from './catalogo-items/catalogo-items.component';

// RF-WEB-01: administración del catálogo web dentro de "Página Web".
export const CatalogoWebRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'pagina_web/catalogo', component: CatalogoItemsComponent }
    ]
  }
];
