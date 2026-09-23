import { Routes } from '@angular/router';

import { ProductoComponent } from './producto/producto.component';
import { StockComponent } from './stock/stock.component';
import { CrearStockComponent } from './crear-stock/crear-stock.component';

//FALTA PERDIDA

export const BodegaRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'bodega/producto',
        component: ProductoComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'bodega/stock',
        component: StockComponent
      }
    ]
  },
  {
    path: '',
    children: [
      {
        path: 'bodega/crear-stock',
        component: CrearStockComponent
      }
    ]
  }
];
