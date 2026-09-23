import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { CommonModule  } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { EditarPerfilComponent } from './editar-perfil.component';
import { EditarPerfilRoutes } from './editar-perfil.routing'

import { MaterialModule } from '../../app.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';



@NgModule({
    imports:[
        CommonModule,
        RouterModule.forChild(EditarPerfilRoutes),
        FormsModule,
        MaterialModule,
        NgxCleaveDirectiveModule,
        NgbModule

    ],
    declarations:[EditarPerfilComponent]
})

export class EditarPerfilModule {}
