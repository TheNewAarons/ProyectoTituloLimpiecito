import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FiltrosAnalytics, RangoPeriodo } from '../../../model/analytics';
import { generarMeses, idDesdeQuery, mesActualSantiago, rangoDesdeQuery } from '../compartido/filtro-periodo/filtro-periodo.component';

// RF-BI-01a: inicio de Analytics; los filtros viajan por query params a cada tablero y vuelven con el botón Volver.
@Component({
  selector: 'app-analytics-inicio',
  templateUrl: './analytics-inicio.component.html'
})
export class AnalyticsInicioComponent implements OnInit {
  filtros: FiltrosAnalytics = { desde: generarMeses(mesActualSantiago(), 3)[2], hasta: mesActualSantiago(), centroCostoId: null, clienteId: null };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const rango = rangoDesdeQuery(q);
    this.filtros = {
      desde: rango ? rango.desde : this.filtros.desde,
      hasta: rango ? rango.hasta : this.filtros.hasta,
      centroCostoId: idDesdeQuery(q, 'centro_costo_id'),
      clienteId: idDesdeQuery(q, 'cliente_id')
    };
  }

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
