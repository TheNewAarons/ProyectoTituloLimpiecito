import { Routes } from '@angular/router';

import { AfpComponent } from './afp/afp.component';
import { SaludComponent } from './salud/salud.component';
import { SeguroComponent } from './seguro/seguro.component';


export const DescuentoRoutes: Routes = [
    {
        path:'',
        children: [{
            path: 'descuento/prevision',
            component: AfpComponent
        }]
    },
    {
        path:'',
        children: [{
            path: 'descuento/salud',
            component: SaludComponent
        }]
    },
    {
        path:'',
        children: [{
            path: 'descuento/seguro',
            component: SeguroComponent
        }]
    }
]