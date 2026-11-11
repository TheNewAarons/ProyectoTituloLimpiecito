import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { OrdenRecepcion, ResultadoRecepcion, ETIQUETA_ORDEN, BADGE_ORDEN } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: confirmar la recepción de una orden por línea (por defecto, lo pendiente de cada línea)
@Component({
  selector: 'app-orden-recepcion',
  templateUrl: './orden-recepcion.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class OrdenRecepcionComponent implements OnInit {
  orden: OrdenRecepcion = null;
  cantidades: { [itemId: number]: number } = {};
  resultado: ResultadoRecepcion = null;
  etiqueta = ETIQUETA_ORDEN;
  badge = BADGE_ORDEN;
  loading = false;
  enviando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.recepcionService.detalleRecepcion(id).subscribe(
      (r) => {
        this.orden = r.data;
        this.cantidades = {};
        this.orden.items.forEach((l) => { this.cantidades[l.item_id] = l.pendiente; });
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  //VALIDA EN EL CLIENTE: ENTERO ENTRE 0 Y LO PENDIENTE (EL BACKEND VUELVE A VALIDAR)
  errorLinea(itemId: number, pendiente: number): string {
    const valor = Number(this.cantidades[itemId]);
    if (this.cantidades[itemId] === null || this.cantidades[itemId] === undefined || !Number.isInteger(valor) || valor < 0) {
      return 'Ingrese un entero mayor o igual a 0';
    }
    if (valor > pendiente) { return 'No puede superar lo pendiente (' + pendiente + ')'; }
    return '';
  }

  get totalARecibir(): number {
    return this.orden ? this.orden.items.reduce((a, l) => a + (Number(this.cantidades[l.item_id]) || 0), 0) : 0;
  }

  puedeConfirmar(): boolean {
    return !!this.orden && this.orden.recibible && !this.enviando && this.totalARecibir > 0
      && this.orden.items.every((l) => l.pendiente === 0 || !this.errorLinea(l.item_id, l.pendiente));
  }

  confirmar() {
    if (!this.puedeConfirmar()) { return; }
    const items = this.orden.items
      .filter((l) => l.pendiente > 0)
      .map((l) => ({ item_id: l.item_id, cantidad_recibida: Number(this.cantidades[l.item_id]) }));
    swal.fire({
      title: '¿Confirmar recepción?',
      text: 'Se sumarán ' + this.totalARecibir + ' unidades al stock y se asignarán a las solicitudes pendientes más antiguas.',
      icon: 'question',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Confirmar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.enviando = true;
      this.recepcionService.recibir(this.orden.id, items).subscribe(
        (r) => {
          this.enviando = false;
          this.resultado = r.data;
          this.alertas.alertaExitoMsj('Recepción registrada', 'La orden quedó ' + this.etiqueta[r.data.estado] + '.');
          this.cargar();
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  verSolicitud(id: number) {
    this.router.navigate(['/bodega/solicitudes', id]);
  }

  volver() {
    this.router.navigate(['/bodega/ordenes-compra']);
  }
}
