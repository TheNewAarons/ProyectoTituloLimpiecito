import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AfpComponent } from './afp/afp.component';
import { SaludComponent } from './salud/salud.component';
import { SeguroComponent } from './seguro/seguro.component';

import { DescuentoRoutes } from './descuento.routing';

import { MaterialModule } from '../../app.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(DescuentoRoutes),
        NgbModule,
        FormsModule,
        //NgSelectModule,
        //NgOptionHighlightModule,
        MaterialModule
    ],
    declarations: [
        AfpComponent,SaludComponent,SeguroComponent
    ]
})

export class DescuentoModule {}

