import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BodegaRoutes } from './bodega.routing';

import { ProductoComponent } from './producto/producto.component';
import { StockComponent } from './stock/stock.component';

import { MaterialModule } from '../../app.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { LoadingModule } from 'src/app/loading/loading.module';
import { CrearStockComponent } from './crear-stock/crear-stock.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(BodegaRoutes),
    NgbModule,
    FormsModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    NgSelectModule,
    NgOptionHighlightModule,
    LoadingModule
  ],
  declarations: [ProductoComponent, StockComponent, CrearStockComponent]
})
export class BodegaModule {}
