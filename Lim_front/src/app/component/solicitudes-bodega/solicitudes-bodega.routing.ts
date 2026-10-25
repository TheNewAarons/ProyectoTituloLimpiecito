import { Routes } from '@angular/router';

import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';
import { SolicitudDetalleComponent } from './solicitud-detalle/solicitud-detalle.component';
import { SolicitudNuevaComponent } from './solicitud-nueva/solicitud-nueva.component';

// 'nueva' antes de ':id' para que no se lea como id
export const SolicitudesBodegaRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'bodega/solicitudes', component: SolicitudesListaComponent },
      { path: 'bodega/solicitudes/nueva', component: SolicitudNuevaComponent },
      { path: 'bodega/solicitudes/:id', component: SolicitudDetalleComponent }
    ]
  }
];
