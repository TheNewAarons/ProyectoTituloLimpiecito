import { Routes } from '@angular/router';
import { VistaClientesComponent } from './vista-clientes/vista-clientes.component';
import { CarpetaPadreComponent } from './carpeta-padre/carpeta-padre.component';
import { CarpetaHijoComponent } from './carpeta-hijo/carpeta-hijo.component';
import { CrearCarpetaComponent } from './crear-carpeta/crear-carpeta.component';
import { CrearDocumentoComponent } from './crear-documento/crear-documento.component';
import { VerDocumentoComponent } from './ver-documento/ver-documento.component'
import { CrearSubCarpetaComponent } from './crear-sub-carpeta/crear-sub-carpeta.component'

export const CarpetaRoutes: Routes = [
    {
      path: 'carpeta/vista_clientes',
      component: VistaClientesComponent
    },
    {
      path:'carpeta/carpeta_padre/:id_cliente/:id_carpeta_padre/:nombre_cliente',
      component: CarpetaPadreComponent
    },
    {
      path:'carpeta/carpeta_hijo/:id_cliente/:id_carpeta_padre/:id_padre_hijo/:id_hijo/:nombre_cliente/:nombre_carpeta',
      component:CarpetaHijoComponent
    },
    {
      path:'carpeta/carpeta_hijo/:id_cliente/:id_carpeta_padre/:id_padre_hijo/:id_hijo/:nombre_cliente/:nombre_carpeta/:ruta',
      component:CarpetaHijoComponent
    },
    {
      path:'carpeta/crear-carpeta/:id_cliente/:id_carpeta_padre/:nombre_cliente',
      component:CrearCarpetaComponent
    },
    {
      path:'carpeta/crear-sub-carpeta/:id_cliente/:id_carpeta_padre/:id_padre_hijo/:id_hijo/:nombre_cliente/:nombre_carpeta/:ruta',
      component:CrearSubCarpetaComponent
    },
    {
      path:'carpeta/crear-documento/:id_cliente/:id_carpeta_padre/:id_padre_hijo/:id_hijo/:nombre_cliente/:nombre_carpeta/:ruta',
      component:CrearDocumentoComponent
    },
    {
      path:'carpeta/ver-documento/:id_documento',
      component:VerDocumentoComponent
    }

];