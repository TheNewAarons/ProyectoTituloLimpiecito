import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { ConteoResumen, FILTROS_CONTEO, ETIQUETA_CONTEO, BADGE_CONTEO } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-07: conteos físicos de inventario; uno nuevo toma el stock de todos los productos activos
@Component({
  selector: 'app-conteos-lista',
  templateUrl: './conteos-lista.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class ConteosListaComponent implements OnInit {
  conteos: ConteoResumen[] = [];
  filtros = FILTROS_CONTEO;
  etiqueta = ETIQUETA_CONTEO;
  badge = BADGE_CONTEO;
  estado = FILTROS_CONTEO[0].valor;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  creando = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.recepcionService.listarConteos(this.estado, this.page, this.pageSize).subscribe(
      (r) => {
        this.conteos = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.conteos = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  filtrar(): void {
    this.page = 1;
    this.cargar();
  }

  nuevo(): void {
    swal.fire({
      title: '¿Iniciar conteo físico?',
      text: 'Se registrará el stock actual de todos los productos activos como cantidad teórica.',
      input: 'text',
      inputPlaceholder: 'Observación (opcional)',
      inputAttributes: { maxlength: '255' },
      icon: 'question',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Iniciar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (resultado.value === undefined) { return; }
      this.creando = true;
      this.recepcionService.crearConteo(String(resultado.value || '').trim() || null).subscribe(
        (r) => {
          this.creando = false;
          this.ver(r.data.id);
        },
        (error: HttpErrorResponse) => {
          this.creando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  ver(id: number): void {
    this.router.navigate(['/bodega/conteos', id]);
  }
}
