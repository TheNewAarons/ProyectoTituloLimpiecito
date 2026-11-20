import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SolicitudBodegaService } from '../../../../services/solicitud-bodega/solicitud-bodega.service';
import { CentroPermitido, RespuestaBodega } from '../../../../model/solicitud-bodega';

// RF-BI-01a: selector de centro de costo (solo centros ABIERTOS del mes, D-151). "Todos" = null.
@Component({
  selector: 'app-selector-centro-costo',
  templateUrl: './selector-centro-costo.component.html'
})
export class SelectorCentroCostoComponent implements OnInit, OnDestroy {
  @Input() valor: number | null = null;
  @Output() cambio = new EventEmitter<number | null>();

  centros: CentroPermitido[] = [];
  private destruir$ = new Subject<void>();

  constructor(private solicitudBodegaService: SolicitudBodegaService) {}

  ngOnInit(): void {
    this.solicitudBodegaService.obtenerCentros().pipe(takeUntil(this.destruir$)).subscribe(
      (resp: RespuestaBodega<CentroPermitido[]>) => { this.centros = resp.data || []; },
      () => { this.centros = []; }
    );
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }

  etiquetaCentro(c: CentroPermitido): string {
    return 'CC ' + c.numero_cc + (c.cliente ? ' · ' + c.cliente : '');
  }
}
