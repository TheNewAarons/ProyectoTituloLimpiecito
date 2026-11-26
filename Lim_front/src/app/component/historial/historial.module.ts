import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../app.module';
import { HistorialBotonComponent } from './historial-boton.component';
import { HistorialDialogoComponent } from './historial-dialogo.component';

// RNF-SEC-02: botón "Historial" reutilizable; cada módulo que lo usa importa este módulo.
@NgModule({
  imports: [CommonModule, MaterialModule],
  declarations: [HistorialBotonComponent, HistorialDialogoComponent],
  entryComponents: [HistorialDialogoComponent],
  exports: [HistorialBotonComponent]
})
export class HistorialModule {}
