import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CrearCronogramaComponent } from './crear-cronograma/crear-cronograma.component';
import { VerCronogramasComponent } from './ver-cronogramas/ver-cronogramas.component';
import { RouterModule } from '@angular/router';
import { CronogramaRoutes } from './cronograma.routing';
import { VerClientesComponent } from './ver-clientes/ver-clientes.component';
import { MaterialModule } from 'src/app/app.module';
import { VerCronogramaComponent } from './ver-cronograma/ver-cronograma.component';
import { MesPipe } from 'src/app/pipe/mes.pipe';
import { DialogCronogramaComponent } from './dialog-cronograma/dialog-cronograma.component';
import { EditarCronogramaComponent } from './editar-cronograma/editar-cronograma.component';
import { DialogAgregarComponent } from './dialog-agregar/dialog-agregar.component';
import { EstadoCronogramaPipe } from 'src/app/pipe/estado-cronograma.pipe';

@NgModule({
  declarations: [
    CrearCronogramaComponent,
    VerClientesComponent,
    VerCronogramasComponent,
    VerCronogramaComponent,
    MesPipe,
    DialogCronogramaComponent,
    EditarCronogramaComponent,
    DialogAgregarComponent,
    EstadoCronogramaPipe
  ],
  entryComponents:[DialogCronogramaComponent, DialogAgregarComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    MaterialModule,
    RouterModule.forChild(CronogramaRoutes)
  ]
})
export class CronogramaModule { }
