import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartsModule } from 'ng2-charts';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { AnalyticsRoutes } from './analytics.routing';
import { AnalyticsBodegaRoutes } from './analytics.routing';
import { AnalyticsProductividadRoutes } from './analytics.routing';
import { ProductividadPevComponent } from './productividad/productividad-pev.component';
import { AnalyticsInicioComponent } from './inicio/analytics-inicio.component';
import { DashboardFinancieroComponent } from './financiero/dashboard-financiero.component';
import { RentabilidadComponent } from './rentabilidad/rentabilidad.component';
import { ConsumoBodegaComponent } from './bodega/consumo-bodega.component';
import { KpiCardComponent } from './compartido/kpi-card/kpi-card.component';
import { GraficoComponent } from './compartido/grafico/grafico.component';
import { FiltroPeriodoComponent } from './compartido/filtro-periodo/filtro-periodo.component';
import { SelectorCentroCostoComponent } from './compartido/selector-centro-costo/selector-centro-costo.component';
import { SelectorClienteComponent } from './compartido/selector-cliente/selector-cliente.component';
import { PaginacionModule } from '../paginacion/paginacion';

// RF-BI-01a: módulo lazy de Analytics. ChartsModule solo aquí para que chart.js quede en este chunk (D-149).
@NgModule({
  imports: [
    CommonModule,
    PaginacionModule, // AUT-024: tablas paginadas
    FormsModule,
    RouterModule.forChild(AnalyticsRoutes),
    RouterModule.forChild(AnalyticsBodegaRoutes),
    RouterModule.forChild(AnalyticsProductividadRoutes),
    MaterialModule,
    LoadingModule,
    ChartsModule
  ],
  declarations: [
    AnalyticsInicioComponent,
    DashboardFinancieroComponent,
    RentabilidadComponent,
    ConsumoBodegaComponent,
    ProductividadPevComponent,
    KpiCardComponent,
    GraficoComponent,
    FiltroPeriodoComponent,
    SelectorCentroCostoComponent,
    SelectorClienteComponent
  ]
})
export class AnalyticsModule {}
