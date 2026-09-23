import { Routes } from '@angular/router';
import { CrearCronogramaComponent } from './crear-cronograma/crear-cronograma.component';
import { EditarCronogramaComponent } from './editar-cronograma/editar-cronograma.component';
import { VerClientesComponent } from './ver-clientes/ver-clientes.component';
import { VerCronogramaComponent } from './ver-cronograma/ver-cronograma.component';
import { VerCronogramasComponent } from './ver-cronogramas/ver-cronogramas.component';

export const CronogramaRoutes: Routes = [
    {
      path: 'cronograma/vista_clientes',
      component: VerClientesComponent
    },
    {
        path:'cronograma/crear-cronograma/:id_cliente',
        component:CrearCronogramaComponent
    },
    {
        path:'cronograma/ver-cronogramas/:id_cliente/:nombre',
        component:VerCronogramasComponent
    },
    {
        path:'cronograma/ver-cronograma/:id_cliente/:id_cronograma/:turno',
        component:VerCronogramaComponent
    },
    {
        path:'cronograma/editar-cronograma/:id_cliente/:id_cronograma/:turno',
        component:EditarCronogramaComponent
    }
];