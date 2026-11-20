import { Component } from '@angular/core';
import { FiltrosAnalytics, RangoPeriodo } from '../../../model/analytics';
import { mesActualSantiago } from '../compartido/filtro-periodo/filtro-periodo.component';

// RF-BI-01a: inicio de Analytics; barra de filtros para verificar la base. Cada BI-0x agrega su enlace/tablero.
@Component({
  selector: 'app-analytics-inicio',
  templateUrl: './analytics-inicio.component.html'
})
export class AnalyticsInicioComponent {
  filtros: FiltrosAnalytics = { desde: mesActualSantiago(), hasta: mesActualSantiago(), centroCostoId: null, clienteId: null };

  cambiarPeriodo(rango: RangoPeriodo): void {
    this.filtros = { ...this.filtros, desde: rango.desde, hasta: rango.hasta };
  }

  cambiarCentro(id: number | null): void {
    this.filtros = { ...this.filtros, centroCostoId: id };
  }

  cambiarCliente(id: number | null): void {
    this.filtros = { ...this.filtros, clienteId: id };
  }
}
