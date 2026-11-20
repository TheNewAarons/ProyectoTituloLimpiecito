import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClienteService } from '../../../../services/cliente/cliente.service';
import { OpcionCliente } from '../../../../model/analytics';

// Forma legacy de GET /cliente/ver-activo (el servicio no se toca, D-151).
interface RespuestaClientesActivos {
  clientes: { id: number; representante: string }[];
}

// RF-BI-01a: selector de cliente activo. "Todos" = null.
@Component({
  selector: 'app-selector-cliente',
  templateUrl: './selector-cliente.component.html'
})
export class SelectorClienteComponent implements OnInit, OnDestroy {
  @Input() valor: number | null = null;
  @Output() cambio = new EventEmitter<number | null>();

  clientes: OpcionCliente[] = [];
  private destruir$ = new Subject<void>();

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.clienteService.obtenerClientesActivos().pipe(takeUntil(this.destruir$)).subscribe(
      (resp: RespuestaClientesActivos) => {
        this.clientes = (resp.clientes || []).map((c): OpcionCliente => ({ id: c.id, nombre: c.representante }));
      },
      () => { this.clientes = []; }
    );
  }

  ngOnDestroy(): void {
    this.destruir$.next();
    this.destruir$.complete();
  }
}
