import { Routes } from '@angular/router';

import { AsignacionMasivaComponent } from './asignacion-masiva/asignacion-masiva.component';

// RF-PEV-01: asignación masiva de actividades PEV.
export const PevMasivaRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'pev/asignacion-masiva', component: AsignacionMasivaComponent }
    ]
  }
];
