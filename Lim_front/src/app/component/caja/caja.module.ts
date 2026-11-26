import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CajaComponent } from './caja.component';
import { CajaRoutes } from './caja.routing';
import { VerCajaComponent } from './ver-caja/ver-caja.component';
import { VistaCajaComponent } from './vista-caja/vista-caja.component';
import { MaterialModule } from '../../app.module';
import { HistorialModule } from '../historial/historial.module'; // RNF-SEC-02 (AUT-021): botón Historial junto a Reabrir mes
import { LoadingModule } from '../../loading/loading.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(CajaRoutes), FormsModule, MaterialModule, LoadingModule, NgxCleaveDirectiveModule, NgbModule, HistorialModule],
  declarations: [CajaComponent, VerCajaComponent, VistaCajaComponent]
})
export class CajaModule {}
