import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ListasPevRoutes } from './listas-pev.routing';
import { VerListasPevComponent } from './ver-listas-pev/ver-listas-pev.component';
import { ListaPevTrabajadorComponent } from './lista-pev-trabajador/lista-pev-trabajador.component';
import { VistaListaPevTrabajadorComponent } from './vista-lista-pev-trabajador/vista-lista-pev-trabajador.component';
import { CrearListaPevTrabajadorComponent } from './crear-lista-pev-trabajador/crear-lista-pev-trabajador.component';
import { MaterialModule } from '../../app.module';
import { AsociarTrabajadoresCronogramaComponent } from './asociar-trabajadores-cronograma/asociar-trabajadores-cronograma.component';
import { CrearListaSupervisorComponent } from './lista_supervisor/crear-lista-supervisor/crear-lista-supervisor.component';
import { VerListaSupervisorComponent } from './lista_supervisor/ver-lista-supervisor/ver-lista-supervisor.component';
import { EstadoListaPevSupPipe } from 'src/app/pipe/estado-lista-pev-sup.pipe';
import { DialogImprimirListaCheckComponent } from './dialog-imprimir-lista-check/dialog-imprimir-lista-check.component';
import { DialogImprimirListaSupervisorComponent } from './dialog-imprimir-lista-supervisor/dialog-imprimir-lista-supervisor.component';


@NgModule({
  declarations: [VerListasPevComponent, ListaPevTrabajadorComponent,
    VistaListaPevTrabajadorComponent, CrearListaPevTrabajadorComponent,
    AsociarTrabajadoresCronogramaComponent, CrearListaSupervisorComponent,
    VerListaSupervisorComponent, EstadoListaPevSupPipe, DialogImprimirListaCheckComponent, DialogImprimirListaSupervisorComponent],
  entryComponents:[DialogImprimirListaCheckComponent,DialogImprimirListaSupervisorComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    RouterModule.forChild(ListasPevRoutes),
    MaterialModule
  ]
})
export class ListasPevModule { }
