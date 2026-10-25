import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { SolicitudBodegaService } from '../../../services/solicitud-bodega/solicitud-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { SolicitudBodega, FILTROS_ESTADO, BADGE_ESTADO } from '../../../model/solicitud-bodega';
import { mostrarErrorBodega } from '../solicitudes-bodega.errores';

// RF-BOD-01: listado de solicitudes (Admin / Operaciones) con filtro por estado y paginación del servidor
@Component({
  selector: 'app-solicitudes-lista',
  templateUrl: './solicitudes-lista.component.html',
  styleUrls: ['../solicitudes-bodega.css']
})
export class SolicitudesListaComponent implements OnInit {
  solicitudes: SolicitudBodega[] = [];
  filtros = FILTROS_ESTADO;
  badge = BADGE_ESTADO;
  estado = '';
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;

  constructor(
    private solicitudService: SolicitudBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargar();
  }

  //CARGAR PAGINA ACTUAL CON EL FILTRO ELEGIDO
  cargar() {
    this.loading = true;
    this.solicitudService.listar(this.estado, this.page, this.pageSize).subscribe(
      (r) => {
        this.solicitudes = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.solicitudes = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  //AL CAMBIAR EL FILTRO SE VUELVE A LA PRIMERA PAGINA
  filtrar() {
    this.page = 1;
    this.cargar();
  }

  ver(id: number) {
    this.router.navigate(['/bodega/solicitudes', id]);
  }

  nueva() {
    this.router.navigate(['/bodega/solicitudes/nueva']);
  }
}
