import { Routes } from '@angular/router';

import { DashboardBodegaComponent } from './dashboard-bodega/dashboard-bodega.component';

// '/bodega' (sin subruta) lleva al home del módulo; las demás rutas de bodega no cambian.
export const BodegaInicioRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'bodega', redirectTo: 'bodega/inicio', pathMatch: 'full' },
      { path: 'bodega/inicio', component: DashboardBodegaComponent }
    ]
  }
];
