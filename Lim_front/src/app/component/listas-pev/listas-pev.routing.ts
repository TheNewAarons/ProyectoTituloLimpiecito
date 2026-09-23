import { Routes } from '@angular/router';
import { AsociarTrabajadoresCronogramaComponent } from './asociar-trabajadores-cronograma/asociar-trabajadores-cronograma.component';
import { CrearListaPevTrabajadorComponent } from './crear-lista-pev-trabajador/crear-lista-pev-trabajador.component';
import { ListaPevTrabajadorComponent } from './lista-pev-trabajador/lista-pev-trabajador.component';
import { CrearListaSupervisorComponent } from './lista_supervisor/crear-lista-supervisor/crear-lista-supervisor.component';
import { VerListaSupervisorComponent } from './lista_supervisor/ver-lista-supervisor/ver-lista-supervisor.component';
import { VerListasPevComponent } from './ver-listas-pev/ver-listas-pev.component';
import { VistaListaPevTrabajadorComponent } from './vista-lista-pev-trabajador/vista-lista-pev-trabajador.component';

export const ListasPevRoutes: Routes = [
    {
      path: 'listas-pev/ver-listas-pev/:id_cronograma/:id_cliente/:nombre/:turno',
      component: VerListasPevComponent
    },
    {
      path: 'listas-pev/ver-listas-pev-trabajador/:id_cronograma/:n_empleado/:nombre/:apellido/:turno/:nombre_cliente',
      component: ListaPevTrabajadorComponent
    },
    {
      path: 'listas-pev/vista-lista-pev-trabajador/:id_lista_pev/:nombre/:turno',
      component: VistaListaPevTrabajadorComponent
    },
    {
      path: 'listas-pev/crear-lista-pev-trabajador/:id_cronograma/:n_empleado',
      component: CrearListaPevTrabajadorComponent
    },
    {
      path: 'listas-pev/asociar-trabajadores-cronograma/:id_cronograma/:id_cliente',
      component: AsociarTrabajadoresCronogramaComponent
    },
    {
      path: 'listas-supervisor/crear-lista/:id_lista_pev',
      component: CrearListaSupervisorComponent
    },
    {
      path:'listas-supervisor/ver_lista_supervisor/:id_lista_supervisor/:nombre/:turno',
      component: VerListaSupervisorComponent
    }
];