import { Routes } from '@angular/router';

import { OrdenesCompraListaComponent } from './ordenes-compra-lista/ordenes-compra-lista.component';
import { OrdenRecepcionComponent } from './orden-recepcion/orden-recepcion.component';
import { MovimientosBodegaComponent } from './movimientos-bodega/movimientos-bodega.component';
import { FormatoEntregaComponent } from './formato-entrega/formato-entrega.component';

// 'bodega/solicitudes/:id/formato' tiene un segmento más que 'bodega/solicitudes/:id' (RF-BOD-01): no chocan.
export const RecepcionBodegaRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'bodega/ordenes-compra', component: OrdenesCompraListaComponent },
      { path: 'bodega/ordenes-compra/:id', component: OrdenRecepcionComponent },
      { path: 'bodega/movimientos', component: MovimientosBodegaComponent },
      { path: 'bodega/solicitudes/:id/formato', component: FormatoEntregaComponent }
    ]
  }
];
