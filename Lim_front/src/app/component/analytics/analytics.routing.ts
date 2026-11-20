import { Routes } from '@angular/router';

import { AnalyticsInicioComponent } from './inicio/analytics-inicio.component';
import { DashboardFinancieroComponent } from './financiero/dashboard-financiero.component';
import { RentabilidadComponent } from './rentabilidad/rentabilidad.component';
import { ConsumoBodegaComponent } from './bodega/consumo-bodega.component';

// RF-BI-01a: '/analytics' lleva al inicio; cada BI-0x agrega su ruta (financiero, rentabilidad, bodega, productividad, demanda; D-148).
export const AnalyticsRoutes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: AnalyticsInicioComponent },
  { path: 'financiero', component: DashboardFinancieroComponent },
  { path: 'rentabilidad', component: RentabilidadComponent }
];
// RF-BI-03: arreglo propio registrado con un segundo forChild (AOT copia el literal: no sirve hacer push a AnalyticsRoutes).
export const AnalyticsBodegaRoutes: Routes = [{ path: 'bodega', component: ConsumoBodegaComponent }];
