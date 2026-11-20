import { Routes } from '@angular/router';

import { AnalyticsInicioComponent } from './inicio/analytics-inicio.component';

// RF-BI-01a: '/analytics' lleva al inicio; cada BI-0x agrega su ruta (financiero, rentabilidad, bodega, productividad, demanda; D-148).
export const AnalyticsRoutes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: AnalyticsInicioComponent }
];
