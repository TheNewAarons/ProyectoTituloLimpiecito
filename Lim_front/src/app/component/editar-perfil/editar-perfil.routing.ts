import { Routes } from '@angular/router'

import { EditarPerfilComponent } from './editar-perfil.component'

export const EditarPerfilRoutes: Routes = [
    {
        path: '',
        children: [{
            path:'perfil',
            component: EditarPerfilComponent
        }]
    }
    
]