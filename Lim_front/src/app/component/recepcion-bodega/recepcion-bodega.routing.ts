import { Routes } from '@angular/router';

import { OrdenesCompraListaComponent } from './ordenes-compra-lista/ordenes-compra-lista.component';
import { OrdenRecepcionComponent } from './orden-recepcion/orden-recepcion.component';
import { MovimientosBodegaComponent } from './movimientos-bodega/movimientos-bodega.component';
import { FormatoEntregaComponent } from './formato-entrega/formato-entrega.component';
import { KardexProductoComponent } from './kardex-producto/kardex-producto.component';
import { ConteosListaComponent } from './conteos-lista/conteos-lista.component';
import { ConteoDetalleComponent } from './conteo-detalle/conteo-detalle.component';
import { ProveedoresListaComponent } from './proveedores-lista/proveedores-lista.component';
import { InformeCompraComponent } from './informe-compra/informe-compra.component';

// 'bodega/solicitudes/:id/formato' tiene un segmento más que 'bodega/solicitudes/:id' (RF-BOD-01): no chocan.
export const RecepcionBodegaRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'bodega/ordenes-compra', component: OrdenesCompraListaComponent },
      { path: 'bodega/ordenes-compra/:id', component: OrdenRecepcionComponent },
      { path: 'bodega/movimientos', component: MovimientosBodegaComponent },
      { path: 'bodega/productos/:id/kardex', component: KardexProductoComponent },
      { path: 'bodega/solicitudes/:id/formato', component: FormatoEntregaComponent },
      { path: 'bodega/conteos', component: ConteosListaComponent }, // RF-BOD-07
      { path: 'bodega/conteos/:id', component: ConteoDetalleComponent },
      { path: 'bodega/proveedores', component: ProveedoresListaComponent }, // RF-BOD-03
      { path: 'bodega/informe-compra', component: InformeCompraComponent } // RF-BOD-03 (temporal)
    ]
  }
];
