import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './layouts/admin/admin-layout.component';
import { LoginComponent } from './component/login/login.component';

//SERVICIOS
import { AuthGuardService } from './services/guard/auth-guard.service';
import { RestriccionGuardService } from './services/guard/restriccion-guard.service';
import { ArchivoGuardService } from './services/guard/archivo-guard.service';
import { AppGuardService } from './services/guard/app_guard.service';
import { LvlAppGuardService } from './services/guard/lvl-app-guard.service';

/** RECUPERAR PASS */
// PASS USUARIO SISTEMA
import { RecuperarPasswordComponent } from './component/recuperar-password/recuperar-password.component';
//PASS USUARIO APP
import { RecuperarPassAppComponent } from './component/recuperar-pass-app/recuperar-pass-app.component';


export const AppRoutes: Routes = [
  {
    path: '',
    component: LoginComponent
  },
  {
    path:'sistema/recuperar-password/:token',
    component: RecuperarPasswordComponent
  },
  {
    path:'sistema/recuperar-password-app/:token',
    component: RecuperarPassAppComponent
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuardService],
    children: [
      {
        path: '',
        canActivate: [RestriccionGuardService, ArchivoGuardService, LvlAppGuardService],
        loadChildren: './dashboard/dashboard.module#DashboardModule'
      },
      {
        path: '',
        canActivate: [RestriccionGuardService, ArchivoGuardService,LvlAppGuardService],
        loadChildren: './component/editar-perfil/editar-perfil.module#EditarPerfilModule'
      },
      {
        path: '',
        canActivate: [RestriccionGuardService, ArchivoGuardService,LvlAppGuardService],
        loadChildren: './component/caja/caja.module#CajaModule'
      },
      {
        path: '',
        canActivate: [ArchivoGuardService,LvlAppGuardService],
        loadChildren: './component/centro-costo/centro.module#CentroModule'
      },
      {
        path: '',
        canActivate: [ArchivoGuardService,LvlAppGuardService],
        loadChildren: './component/bodega/bodega.module#BodegaModule'
      },
      {
        path: '',
        canActivate:[LvlAppGuardService],
        loadChildren: './component/colaborador/colaborador.module#ColaboradorModule'
      },

      {
        path: '',
        canActivate: [RestriccionGuardService, ArchivoGuardService,LvlAppGuardService],
        loadChildren: './component/descuento/descuento.module#DescuentoModule'
      },
      {
        path: '',
        canActivate: [LvlAppGuardService],
        loadChildren: './component/gestion/gestion.module#GestionModule'
      },
      {
        path: '',
        canActivate: [RestriccionGuardService,LvlAppGuardService],
        loadChildren: './component/archivo/archivo.module#ArchivoModule'
      },
      {
        path: '',
        canActivate: [ArchivoGuardService,RestriccionGuardService],
        loadChildren: './component/app_servicio/servicio.module#ServicioModule'
      },
      {
        path: '',
        canActivate: [ArchivoGuardService],
        loadChildren: './component/pagina-web/pagina-web.module#PaginaWebModule'
      },
      {
        path: '',
        canActivate: [LvlAppGuardService,ArchivoGuardService,RestriccionGuardService],
        loadChildren: './component/carpeta/carpeta.module#CarpetaModule'
      },
      {
        path:'',
        loadChildren: './component/cronograma/cronograma.module#CronogramaModule'
      },
      {
        path:'',
        loadChildren: './component/listas-pev/listas-pev.module#ListasPevModule'
      }
    ]
  }
];
