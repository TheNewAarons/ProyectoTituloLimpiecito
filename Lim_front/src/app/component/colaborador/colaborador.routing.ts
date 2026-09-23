import { Routes } from '@angular/router';

import { TrabajadorComponent } from './trabajador/trabajador.component';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { PdfLiquidacionComponent } from './pdf-liquidacion/pdf-liquidacion.component';
import { CrearTrabajadorComponent } from './crear-trabajador/crear-trabajador.component';
import { EditarTrabajadorComponent } from './editar-trabajador/editar-trabajador.component';
import { VerTrabajadorComponent } from './ver-trabajador/ver-trabajador.component';
import { CrearAccesoTrabajadorComponent } from './crear-acceso-trabajador/crear-acceso-trabajador.component';

import { RestriccionGuardService } from '../../services/guard/restriccion-guard.service';
import { ArchivoGuardService } from 'src/app/services/guard/archivo-guard.service';

export const ColaboradorRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'colaborador/trabajador',
        component: TrabajadorComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'colaborador/liquidacion',
        canActivate: [RestriccionGuardService, ArchivoGuardService],
        component: LiquidacionComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'liquidacion/pdf/:id',
        canActivate: [RestriccionGuardService, ArchivoGuardService],
        component: PdfLiquidacionComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'trabajador/editar/:id',
        component: EditarTrabajadorComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'trabajador/crear',
        component: CrearTrabajadorComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'trabajador/ver/:idTrabajador',
        component: VerTrabajadorComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'trabajador/acceso/:idTrabajador',
        component: CrearAccesoTrabajadorComponent
      }
    ]
  }
];
