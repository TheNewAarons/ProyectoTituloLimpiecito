import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartsModule } from 'ng2-charts';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { AnalyticsRoutes } from './analytics.routing';
import { AnalyticsInicioComponent } from './inicio/analytics-inicio.component';
import { KpiCardComponent } from './compartido/kpi-card/kpi-card.component';
import { GraficoComponent } from './compartido/grafico/grafico.component';
import { FiltroPeriodoComponent } from './compartido/filtro-periodo/filtro-periodo.component';
import { SelectorCentroCostoComponent } from './compartido/selector-centro-costo/selector-centro-costo.component';
import { SelectorClienteComponent } from './compartido/selector-cliente/selector-cliente.component';

// RF-BI-01a: módulo lazy de Analytics. ChartsModule solo aquí para que chart.js quede en este chunk (D-149).
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(AnalyticsRoutes),
    MaterialModule,
    LoadingModule,
    ChartsModule
  ],
  declarations: [
    AnalyticsInicioComponent,
    KpiCardComponent,
    GraficoComponent,
    FiltroPeriodoComponent,
    SelectorCentroCostoComponent,
    SelectorClienteComponent
  ]
})
export class AnalyticsModule {}
