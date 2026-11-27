import { Component, Input, OnChanges } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PevAsignacionesService } from '../../../services/pev-asignaciones/pev-asignaciones.service';
import { AsignacionCronograma } from '../../../model/pev-asignaciones';
import { nuevaPaginacion } from '../../paginacion/paginacion';

// RF-PEV-02 (AUT-016, obs. 12): panel "Asignaciones de actividades" en Ver Cronograma. Solo lectura.
@Component({
  selector: 'app-asignaciones-cronograma',
  templateUrl: './asignaciones-cronograma.component.html'
})
export class AsignacionesCronogramaComponent implements OnChanges {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagAsignaciones = nuevaPaginacion();
  @Input() cronogramaId: number;
  asignaciones: AsignacionCronograma[] = [];
  cargando = false;
  sinPermiso = false;
  error = false;

  constructor(private servicio: PevAsignacionesService) {}

  ngOnChanges() {
    if (!this.cronogramaId) { return; }
    this.cargando = true;
    this.error = false;
    this.sinPermiso = false;
    this.servicio.deCronograma(this.cronogramaId).subscribe(
      (r) => { this.asignaciones = r.data; this.cargando = false; },
      (e: HttpErrorResponse) => {
        this.cargando = false;
        // Sin permiso (no Admin): el panel se oculta en vez de mostrar un error.
        this.asignaciones = []; // no dejar datos viejos junto al aviso de error
        if (e.status === 401 || e.status === 403) { this.sinPermiso = true; } else { this.error = true; }
      }
    );
  }

  // Cantidad de trabajadores distintos con asignación vigente (para el encabezado).
  get trabajadores(): number {
    return new Set(this.asignaciones.filter((a) => a.estado === 'ACTIVA').map((a) => a.trabajador_id)).size;
  }
}
