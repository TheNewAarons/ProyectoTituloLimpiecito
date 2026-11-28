import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ClienteComponent } from './cliente/cliente.component';
import { UsuarioComponent } from './usuario/usuario.component';
import { EgresoComponent } from './egreso/egreso.component';
import { IngresoComponent } from './ingreso/ingreso.component';

import { ClientePevComponent } from './cliente-pev/cliente-pev.component';
import { FormClienteSectorPevComponent } from './shared/form-cliente-sector-pev/form-cliente-sector-pev.component';
import { TablaClienteSectorPevComponent } from './shared/tabla-cliente-sector-pev/tabla-cliente-sector-pev.component';
import { CrearSectorPevComponent } from './crear-sector-pev/crear-sector-pev.component';
import { SectoresPevComponent } from './sectores-pev/sectores-pev.component';
import { CrearAreasPevComponent } from './crear-areas-pev/crear-areas-pev.component';
import { AreasPevComponent } from './areas-pev/areas-pev.component';
import { FormAreaPevComponent } from './shared/form-area-pev/form-area-pev.component';
import { TablaAreaPevComponent } from './shared/tabla-area-pev/tabla-area-pev.component';
import { TablaTareaPevComponent } from './shared/tabla-tarea-pev/tabla-tarea-pev.component';
import { TareasPevComponent } from './tareas-pev/tareas-pev.component';

import { GestionRoutes } from './gestion.routing';

import { MaterialModule } from '../../app.module';
import { HistorialModule } from '../historial/historial.module'; // RNF-SEC-02: botón Historial
import { FechaRangoModule } from '../fecha-rango/fecha-rango';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { RestriccionGuardService } from '../../services/guard/restriccion-guard.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Ng2Rut } from 'ng2-rut';
import { CrearAccesoClienteComponent } from './crear-acceso-cliente/crear-acceso-cliente.component';
import { CrearClienteComponent } from './crear-cliente/crear-cliente.component';
import { VerClienteComponent } from './ver-cliente/ver-cliente.component';
import { DialogSectorEditarNombreComponent } from './shared/dialog-sector-editar-nombre/dialog-sector-editar-nombre.component';
import { DialogAreaEditarNombreComponent } from './shared/dialog-area-editar-nombre/dialog-area-editar-nombre.component';
import { DialogTareaEditarNombreComponent } from './shared/dialog-tarea-editar-nombre/dialog-tarea-editar-nombre.component';
import { PaginacionModule } from '../paginacion/paginacion';

@NgModule({
  imports: [
    CommonModule,
    PaginacionModule, // AUT-024: tablas paginadas
    FechaRangoModule, // AUT-026: límites de fechas del cliente
    HistorialModule,
    RouterModule.forChild(GestionRoutes),
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    //NgSelectModule,
    //NgOptionHighlightModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    Ng2Rut
  ],
  entryComponents:[DialogSectorEditarNombreComponent,DialogAreaEditarNombreComponent,DialogTareaEditarNombreComponent],
  declarations: [
    ClienteComponent,
    UsuarioComponent,
    EgresoComponent,
    IngresoComponent,
    CrearClienteComponent,
    VerClienteComponent,
    CrearAccesoClienteComponent,
    ClientePevComponent,
    FormClienteSectorPevComponent,
    TablaClienteSectorPevComponent,
    CrearSectorPevComponent,
    SectoresPevComponent,
    CrearAreasPevComponent,
    AreasPevComponent,
    FormAreaPevComponent,
    TablaAreaPevComponent,
    TablaTareaPevComponent,
    TareasPevComponent,
    DialogSectorEditarNombreComponent,
    DialogAreaEditarNombreComponent,
    DialogTareaEditarNombreComponent
  ],
  providers: [RestriccionGuardService]
})
export class GestionModule {}
