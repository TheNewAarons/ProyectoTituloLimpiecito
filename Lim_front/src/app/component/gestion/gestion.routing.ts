import { Routes } from '@angular/router';

import { ClienteComponent } from './cliente/cliente.component';
import { UsuarioComponent } from './usuario/usuario.component';
import { EgresoComponent } from './egreso/egreso.component';

import { RestriccionGuardService } from '../../services/guard/restriccion-guard.service';
import { CrearAccesoClienteComponent } from './crear-acceso-cliente/crear-acceso-cliente.component';
import { CrearClienteComponent } from './crear-cliente/crear-cliente.component';
import { VerClienteComponent } from './ver-cliente/ver-cliente.component';

import { ClientePevComponent } from './cliente-pev/cliente-pev.component';
import { CrearSectorPevComponent } from './crear-sector-pev/crear-sector-pev.component';
import { SectoresPevComponent } from './sectores-pev/sectores-pev.component';
import { AreasPevComponent } from './areas-pev/areas-pev.component';
import { CrearAreasPevComponent } from './crear-areas-pev/crear-areas-pev.component';
import { TareasPevComponent } from './tareas-pev/tareas-pev.component';

import { ArchivoGuardService } from 'src/app/services/guard/archivo-guard.service';

export const GestionRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'gestion/usuarios',
        canActivate: [ArchivoGuardService],
        component: UsuarioComponent
      }
    ]
  },
  {
    path: '',
    canActivate: [RestriccionGuardService, ArchivoGuardService],
    children: [
      {
        path: 'gestion/egreso',
        component: EgresoComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'gestion/clientes',
        component: ClienteComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'gestion/clientes/ver-cliente/:idCliente',
        component: VerClienteComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'gestion/clientes/crear',
        component: CrearClienteComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'gestion/clientes/crear-acceso/:idCliente',
        component: CrearAccesoClienteComponent
      }
    ]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/cliente-pev/:id_cliente',
          component: ClientePevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/crear-sector-pev/:id_cliente',
          component: CrearSectorPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/sectores-pev/:id_cliente',
          component: SectoresPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/crear-area-pev/:id_cliente',
          component: CrearAreasPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/crear-area-pev/:id_sector/:id_cliente',
          component: CrearAreasPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/areas-pev/:id_cliente',
          component: AreasPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/tareas-pev/:id_cliente',
          component: TareasPevComponent
      }]
  },
  {
      path:'',
      canActivate:[RestriccionGuardService],
      children: [{
          path:'gestion/tareas-pev/:id_cliente/:id_area',
          component: TareasPevComponent
      }]
  },
];
