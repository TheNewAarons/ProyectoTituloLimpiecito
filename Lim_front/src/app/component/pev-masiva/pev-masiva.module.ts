import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaterialModule } from '../../app.module';
import { LoadingModule } from 'src/app/loading/loading.module';

import { PevMasivaRoutes } from './pev-masiva.routing';
import { AsignacionMasivaComponent } from './asignacion-masiva/asignacion-masiva.component';

// RF-PEV-01: asignación masiva PEV (módulo nuevo con carga diferida)
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(PevMasivaRoutes),
    MaterialModule,
    LoadingModule
  ],
  declarations: [AsignacionMasivaComponent]
})
export class PevMasivaModule {}
