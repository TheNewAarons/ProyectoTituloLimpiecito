import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material';
import { LoginService } from '../../services/login/login.service';
import { HistorialDialogoComponent } from './historial-dialogo.component';

// RNF-SEC-02: botón "Historial" que se pone junto a los botones de una decisión con dinero.
// Uso: <app-historial entidad="cajas" [entidadId]="caja?.id" titulo="Caja 2026-11"></app-historial>
// [compacto]="true" muestra solo el ícono (para filas de tablas). Solo lo ve el Administrador (como la auditoría).
@Component({
  selector: 'app-historial',
  template: `
    <button *ngIf="visible()" mat-raised-button type="button" matTooltip="Ver quién hizo cada cambio y cuándo"
      [ngClass]="compacto ? 'btn btn-info btn-link btn-just-icon btn-sm' : 'btn btn-info btn-sm'" (click)="abrir()">
      <i class="material-icons">history</i><span *ngIf="!compacto"> Historial</span>
    </button>
  `
})
export class HistorialBotonComponent {
  @Input() entidad: string;
  @Input() entidadId: number | string;
  @Input() titulo = '';
  @Input() compacto = false;

  constructor(private dialog: MatDialog, private loginService: LoginService) {}

  visible(): boolean {
    const u: any = this.loginService.obtenerDatosUsuario();
    const rol = u && u.role && u.role.nombre ? String(u.role.nombre) : '';
    return rol.toUpperCase() === 'ADMINISTRADOR' && !!this.entidad && this.entidadId !== null && this.entidadId !== undefined;
  }

  abrir() {
    this.dialog.open(HistorialDialogoComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: { entidad: this.entidad, entidadId: this.entidadId, titulo: this.titulo || this.entidad }
    });
  }
}
