import { Component, Input, NgModule, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

// Retroalimentación de la revisión (AUT-024): paginación de las listas que crecen con el uso.
// Uso:  ts   →  pagSolicitudes = nuevaPaginacion();
//       html →  <tr *ngFor="let s of solicitudes | paginar: pagSolicitudes">
//                <app-paginacion [estado]="pagSolicitudes" [total]="(solicitudes || []).length"></app-paginacion>

export interface EstadoPaginacion { pagina: number; porPagina: number; }

export function nuevaPaginacion(porPagina = 10): EstadoPaginacion {
  return { pagina: 1, porPagina: porPagina };
}

// Impuro a propósito: la página vive en un objeto que cambia al hacer clic. Si la lista se achica (filtro, recarga)
// y la página quedó fuera de rango, se ajusta a la última existente antes de dibujar (sin páginas vacías).
@Pipe({ name: 'paginar', pure: false })
export class PaginarPipe implements PipeTransform {
  transform<T>(lista: T[], estado: EstadoPaginacion): T[] {
    if (!Array.isArray(lista) || !estado) { return lista; }
    const ultima = Math.max(1, Math.ceil(lista.length / estado.porPagina));
    if (estado.pagina > ultima) { estado.pagina = ultima; }
    if (estado.pagina < 1) { estado.pagina = 1; }
    const desde = (estado.pagina - 1) * estado.porPagina;
    return lista.slice(desde, desde + estado.porPagina);
  }
}

@Component({
  selector: 'app-paginacion',
  template: `
    <!-- Mismo pie de tabla que el resto del sistema (vista-documentos, liquidaciones, egresos…): solo ngb-pagination. -->
    <ngb-pagination *ngIf="estado" [(page)]="estado.pagina" [pageSize]="estado.porPagina" [collectionSize]="total"
      [maxSize]="5" [rotate]="true" [boundaryLinks]="true">
    </ngb-pagination>
  `
})
export class PaginacionComponent {
  @Input() estado: EstadoPaginacion;
  @Input() total = 0;
}

@NgModule({
  imports: [CommonModule, NgbPaginationModule],
  declarations: [PaginarPipe, PaginacionComponent],
  exports: [PaginarPipe, PaginacionComponent]
})
export class PaginacionModule {}
