import { Routes } from '@angular/router'

import { CajaComponent } from './caja.component'
import { VerCajaComponent } from './ver-caja/ver-caja.component';
import { VistaCajaComponent } from './vista-caja/vista-caja.component';

export const CajaRoutes: Routes = [
    {
        path: '',
        children: [{
            path:'cajas',
            component: CajaComponent
        }]
    },
    {
        path: '',
        children: [{
            path:'cajas/ver/:id',
            component: VerCajaComponent
        }]
    },
    {
        path: '',
        children: [{
            path:'cajas/vista/:id',
            component: VistaCajaComponent
        }]
    }
]

