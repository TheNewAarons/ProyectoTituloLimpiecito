import { Component, Inject, Input, NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef, MatTooltipModule, MAT_DIALOG_DATA } from '@angular/material';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { FiltrosProductividad, ObservacionPev } from '../../../model/analytics';
import { PaginacionModule, nuevaPaginacion } from '../../paginacion/paginacion';

export interface DatosObservacionesPev {
  sectorId: number;
  sector: string;
  cliente: string | null;
  filtros: FiltrosProductividad;
}

// Retroalimentación de la revisión: el texto de las observaciones de un sector en un modal (antes solo el número).
@Component({
  selector: 'app-observaciones-pev-dialogo',
  template: `
    <h2 mat-dialog-title>Observaciones · {{ data.sector }}</h2>
    <p class="text-muted mb-2">{{ data.cliente || '' }} · {{ data.filtros.desde }} a {{ data.filtros.hasta }}</p>
    <div mat-dialog-content>
      <p *ngIf="cargando" class="text-muted">Cargando observaciones…</p>
      <p *ngIf="error" class="text-danger">{{ error }}</p>
      <div class="table-responsive" *ngIf="!cargando && !error">
        <table class="table">
          <thead class="text-primary">
            <tr><th>Fecha</th><th>Quién</th><th>Área / tarea</th><th>Observación</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of observaciones | paginar: pag">
              <td class="text-nowrap">{{ o.fecha | date:'dd/MM/yyyy' }}</td>
              <td>{{ o.autor }}<br /><small class="text-muted">{{ o.origen === 'SUPERVISOR' ? 'Supervisor' : 'Trabajador' }}</small></td>
              <td>{{ o.area || '—' }}<br /><small class="text-muted">{{ o.tarea || '' }}</small></td>
              <td>{{ o.texto }}</td>
            </tr>
            <tr *ngIf="observaciones.length === 0">
              <td colspan="4" class="text-center text-muted">Sin observaciones con texto en el período.</td>
            </tr>
          </tbody>
        </table>
        <app-paginacion [estado]="pag" [total]="observaciones.length"></app-paginacion>
      </div>
    </div>
    <div mat-dialog-actions class="justify-content-end">
      <button mat-raised-button type="button" class="btn btn-danger btn-sm" (click)="dialogRef.close()">Cerrar</button>
    </div>
  `
})
export class ObservacionesPevDialogoComponent implements OnInit {
  observaciones: ObservacionPev[] = [];
  cargando = true;
  error = '';
  pag = nuevaPaginacion();

  constructor(
    public dialogRef: MatDialogRef<ObservacionesPevDialogoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosObservacionesPev,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.analytics.observacionesPev(this.data.sectorId, this.data.filtros).subscribe(
      (r) => { this.observaciones = r.data || []; this.cargando = false; },
      () => { this.cargando = false; this.error = 'No se pudieron cargar las observaciones. Intente nuevamente.'; }
    );
  }
}

// Botón "Ver" de la tabla de sectores: abre el modal con los filtros actuales del dashboard.
@Component({
  selector: 'app-ver-observaciones-pev',
  template: `
    <button mat-raised-button type="button" class="btn btn-info btn-sm ml-2" matTooltip="Leer las observaciones de este sector" (click)="abrir()">Ver</button>
  `
})
export class VerObservacionesPevComponent {
  @Input() sectorId: number;
  @Input() sector: string;
  @Input() cliente: string | null;
  @Input() filtros: FiltrosProductividad;

  constructor(private dialog: MatDialog) {}

  abrir(): void {
    const datos: DatosObservacionesPev = { sectorId: this.sectorId, sector: this.sector, cliente: this.cliente, filtros: this.filtros };
    this.dialog.open(ObservacionesPevDialogoComponent, { width: '900px', maxWidth: '95vw', data: datos });
  }
}

@NgModule({
  imports: [CommonModule, MatDialogModule, MatTooltipModule, PaginacionModule],
  declarations: [ObservacionesPevDialogoComponent, VerObservacionesPevComponent],
  entryComponents: [ObservacionesPevDialogoComponent],
  exports: [VerObservacionesPevComponent]
})
export class ObservacionesPevDialogoModule {}
