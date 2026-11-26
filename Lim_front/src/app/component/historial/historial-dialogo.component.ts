import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { HttpErrorResponse } from '@angular/common/http';
import { HistorialService, RegistroHistorial } from '../../services/historial/historial.service';
import { Linea, detalle, fechaHoraSantiago, textoAccion, textoMotivo } from './historial-formato';

interface Fila { fecha: string; quien: string; rol: string; accion: string; motivo: string; lineas: Linea[]; }

// RNF-SEC-02: quién, cuándo, qué y por qué de una decisión (reapertura de mes, cierre, pago, aprobación…).
@Component({
  selector: 'app-historial-dialogo',
  template: `
    <h2 mat-dialog-title>Historial · {{ data.titulo }}</h2>
    <div mat-dialog-content>
      <p *ngIf="cargando" class="text-muted">Cargando historial…</p>
      <p *ngIf="error" class="text-danger">{{ error }}</p>
      <p *ngIf="!cargando && !error && filas.length === 0" class="text-muted">Todavía no hay cambios registrados.</p>
      <div class="table-responsive" *ngIf="filas.length > 0">
        <table class="table table-sm">
          <thead class="text-primary">
            <tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of filas">
              <td class="text-nowrap">{{ f.fecha }}</td>
              <td>{{ f.quien }}<br *ngIf="f.rol" /><small class="text-muted" *ngIf="f.rol">{{ f.rol }}</small></td>
              <td><strong>{{ f.accion }}</strong></td>
              <td>
                <div *ngIf="f.motivo"><small><strong>Motivo:</strong> {{ f.motivo }}</small></div>
                <div *ngFor="let l of f.lineas"><small>{{ l.etiqueta }}: <span *ngIf="l.antes !== null">{{ l.antes }} → </span><strong>{{ l.despues }}</strong></small></div>
                <small class="text-muted" *ngIf="!f.motivo && f.lineas.length === 0">Sin cambios de montos ni estados.</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="hayMas" class="text-warning"><small>Se muestran los 100 cambios más recientes.</small></p>
    </div>
    <div mat-dialog-actions class="justify-content-end">
      <button mat-raised-button type="button" class="btn btn-danger btn-sm" (click)="dialogRef.close()">Cerrar</button>
    </div>
  `
})
export class HistorialDialogoComponent implements OnInit {
  filas: Fila[] = [];
  cargando = true;
  error = '';
  hayMas = false;

  constructor(
    public dialogRef: MatDialogRef<HistorialDialogoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entidad: string; entidadId: number | string; titulo: string },
    private historial: HistorialService
  ) {}

  ngOnInit() {
    this.historial.historial(this.data.entidad, this.data.entidadId).subscribe(
      (r) => {
        this.cargando = false;
        this.hayMas = !!(r.meta && r.meta.hay_mas);
        this.filas = r.data.map((x: RegistroHistorial) => ({
          fecha: fechaHoraSantiago(x.created_at),
          quien: x.quien ? x.quien.nombre : '',
          rol: x.quien && x.quien.rol ? x.quien.rol : '',
          accion: textoAccion(this.data.entidad, x.accion, x.valores_antes, x.valores_despues),
          motivo: textoMotivo(x.motivo),
          lineas: detalle(this.data.entidad, x.accion, x.valores_antes, x.valores_despues)
        }));
      },
      (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = e.status === 401 ? 'Su sesión expiró. Vuelva a iniciar sesión.'
          : e.status === 403 ? 'Solo un Administrador puede ver el historial.'
          : 'No se pudo cargar el historial. Intente nuevamente.';
      }
    );
  }
}
