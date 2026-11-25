import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OrdenResumen, FILTROS_ORDEN, ETIQUETA_ORDEN, BADGE_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: órdenes de compra para confirmar recepción (por defecto, las que están por recibir)
@Component({
  selector: 'app-ordenes-compra-lista',
  templateUrl: './ordenes-compra-lista.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class OrdenesCompraListaComponent implements OnInit {
  ordenes: OrdenResumen[] = [];
  filtros = FILTROS_ORDEN;
  etiqueta = ETIQUETA_ORDEN;
  badge = BADGE_ORDEN;
  estado = FILTROS_ORDEN[0].valor;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  enviando = false;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.recepcionService.listarOrdenes(this.estado, this.page, this.pageSize).subscribe(
      (r) => {
        this.ordenes = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.ordenes = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  filtrar() {
    this.page = 1;
    this.cargar();
  }

  // RF-BOD-03: OC manual, sin depender del stock
  nueva(): void {
    this.router.navigate(['/bodega/ordenes-compra/nueva']);
  }

  ver(id: number) {
    this.router.navigate(['/bodega/ordenes-compra', id]);
  }

  // RF-BOD-03: crea una OC BORRADOR por proveedor con los faltantes de la lista de compra
  generar(): void {
    this.enviando = true;
    this.alertas.loading();
    this.recepcionService.generarOrdenes().subscribe(
      (r) => {
        this.enviando = false;
        const d = r.data;
        const partes: string[] = [];
        if (d.omitidas.length) { partes.push(d.omitidas.length + ' proveedor(es) ya tenían un borrador.'); }
        if (d.sin_proveedor.length) { partes.push(d.sin_proveedor.length + ' producto(s) sin proveedor activo asignado.'); }
        this.alertas.cerrarAlerta();
        this.alertas.alertaExitoMsj(
          d.creadas.length ? d.creadas.length + ' orden(es) creada(s) en borrador' : 'No se crearon órdenes nuevas',
          partes.join(' ')
        );
        this.estado = 'BORRADOR';
        this.filtrar();
      },
      (error: HttpErrorResponse) => {
        this.enviando = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  enviar(o: OrdenResumen): void {
    swal.fire({
      title: '¿Enviar la orden N° ' + o.id + '?',
      text: 'Se enviará por correo a ' + (o.proveedor || 'el proveedor') + ' y ya no podrá editarse.',
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, ¡Enviar!',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.enviando = true;
      this.alertas.loading();
      this.recepcionService.enviarOrden(o.id).subscribe(
        () => {
          this.enviando = false;
          this.alertas.cerrarAlerta();
          this.alertas.alertaExitoMsj('Orden enviada al proveedor');
          this.cargar();
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }
}
