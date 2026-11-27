import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../../app.module';
import { AsignacionesActividadComponent } from './asignaciones-actividad/asignaciones-actividad.component';
import { PaginacionModule } from '../paginacion/paginacion'; // AUT-024: tablas paginadas
import { HistorialModule } from '../historial/historial.module'; // quién anuló o cerró una asignación

// RF-PEV-02 (AUT-016, obs. 12): pantalla "Asignaciones de una actividad". Se importa en PevMasivaModule (lazy), así que
// su ruta queda bajo los mismos guards; forChild propio para que AOT la registre (lección de RF-BI-03).
export const PevAsignacionesRoutes: Routes = [
  { path: 'pev/asignaciones', component: AsignacionesActividadComponent }
];

@NgModule({
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule.forChild(PevAsignacionesRoutes), PaginacionModule, HistorialModule],
  declarations: [AsignacionesActividadComponent]
})
export class PevAsignacionesModule {}
