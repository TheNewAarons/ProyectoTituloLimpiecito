import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import {
  OrdenRecepcion, LineaRecepcion, ResultadoRecepcion, DocumentoRecepcion, ETIQUETA_ORDEN, BADGE_ORDEN, DOCUMENTOS_RECEPCION
} from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: confirmar la recepción de una orden por línea (por defecto, lo pendiente de cada línea)
// RF-BOD-04b: cada confirmación es una recepción con documento de respaldo y costo real por línea
@Component({
  selector: 'app-orden-recepcion',
  templateUrl: './orden-recepcion.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class OrdenRecepcionComponent implements OnInit {
  orden: OrdenRecepcion = null;
  cantidades: { [itemId: number]: number } = {};
  costos: { [itemId: number]: number } = {};
  documento: DocumentoRecepcion = { documento_tipo: null, documento_numero: '', observacion: '' };
  documentos = DOCUMENTOS_RECEPCION;
  resultado: ResultadoRecepcion = null;
  etiqueta = ETIQUETA_ORDEN;
  badge = BADGE_ORDEN;
  loading = false;
  enviando = false;
  // RF-BOD-03: edición del borrador (cantidad por item_id e items marcados para quitar)
  cantidadesOc: { [itemId: number]: number } = {};
  quitados: number[] = [];

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
        this.costos = {};
        this.cantidadesOc = {};
        this.quitados = [];
        this.orden.items.forEach((l) => {
          this.cantidades[l.item_id] = l.pendiente;
          this.costos[l.item_id] = l.costo_unitario;
          this.cantidadesOc[l.item_id] = l.cantidad;
        });
        this.documento = { documento_tipo: null, documento_numero: '', observacion: '' };
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

  //COSTO REAL OPCIONAL: VACIO = COSTO DE LA ORDEN; SI SE INGRESA, ENTERO >= 0 (CLP)
  errorCosto(itemId: number): string {
    const costo = this.costos[itemId];
    if (costo === null || costo === undefined || String(costo) === '') { return ''; }
    return Number.isInteger(Number(costo)) && Number(costo) >= 0 ? '' : 'Ingrese un monto entero en pesos';
  }

  difiereDeOrden(itemId: number, costoOrden: number): boolean {
    const costo = this.costos[itemId];
    return costoOrden !== null && costo !== null && costo !== undefined && String(costo) !== '' && Number(costo) !== costoOrden;
  }

  //TIPO Y NUMERO DE DOCUMENTO VAN JUNTOS (AMBOS O NINGUNO)
  errorDocumento(): string {
    const numero = (this.documento.documento_numero || '').trim();
    if (!!this.documento.documento_tipo !== !!numero) { return 'Indique tipo y número del documento'; }
    return numero.length > 50 ? 'El número admite hasta 50 caracteres' : '';
  }

  get totalARecibir(): number {
    return this.orden ? this.orden.items.reduce((a, l) => a + (Number(this.cantidades[l.item_id]) || 0), 0) : 0;
  }

  puedeConfirmar(): boolean {
    return !!this.orden && this.orden.recibible && !this.enviando && this.totalARecibir > 0
      && !this.errorDocumento()
      && this.orden.items.every((l) => l.pendiente === 0 || (!this.errorLinea(l.item_id, l.pendiente) && !this.errorCosto(l.item_id)));
  }

  confirmar() {
    if (!this.puedeConfirmar()) { return; }
    const items = this.orden.items
      .filter((l) => l.pendiente > 0)
      .map((l) => {
        const linea: { item_id: number, cantidad_recibida: number, costo_unitario?: number } = {
          item_id: l.item_id, cantidad_recibida: Number(this.cantidades[l.item_id])
        };
        const costo = this.costos[l.item_id];
        if (costo !== null && costo !== undefined && String(costo) !== '') { linea.costo_unitario = Number(costo); }
        return linea;
      });
    const documento: DocumentoRecepcion = {
      documento_tipo: this.documento.documento_tipo || null,
      documento_numero: (this.documento.documento_numero || '').trim() || null,
      observacion: (this.documento.observacion || '').trim() || null
    };
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
      this.recepcionService.recibir(this.orden.id, items, documento).subscribe(
        (r) => {
          this.enviando = false;
          this.resultado = r.data;
          this.alertas.alertaExitoMsj('Recepción N° ' + r.data.recepcion_id + ' registrada',
            'La orden quedó ' + this.etiqueta[r.data.estado] + '.');
          this.cargar();
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  get esBorrador(): boolean {
    return !!this.orden && this.orden.estado === 'BORRADOR';
  }

  get lineasBorrador(): LineaRecepcion[] {
    return this.orden ? this.orden.items.filter((l) => this.quitados.indexOf(l.item_id) === -1) : [];
  }

  //CANTIDAD DE LA OC: ENTERO MAYOR A 0 (PUEDE SUPERAR EL FALTANTE; EL BACKEND VUELVE A VALIDAR)
  errorCantidadOc(itemId: number): string {
    const valor = Number(this.cantidadesOc[itemId]);
    return this.cantidadesOc[itemId] !== null && Number.isInteger(valor) && valor > 0 ? '' : 'Ingrese un entero mayor a 0';
  }

  quitar(itemId: number): void {
    this.quitados.push(itemId);
  }

  hayCambios(): boolean {
    return this.quitados.length > 0
      || (!!this.orden && this.orden.items.some((l) => Number(this.cantidadesOc[l.item_id]) !== l.cantidad));
  }

  puedeGuardar(): boolean {
    return this.esBorrador && !this.enviando && this.hayCambios() && this.lineasBorrador.length > 0
      && this.lineasBorrador.every((l) => !this.errorCantidadOc(l.item_id));
  }

  guardar(): void {
    if (!this.puedeGuardar()) { return; }
    const items = this.lineasBorrador
      .filter((l) => Number(this.cantidadesOc[l.item_id]) !== l.cantidad)
      .map((l) => ({ id: l.item_id, cantidad: Number(this.cantidadesOc[l.item_id]) }));
    this.enviando = true;
    this.recepcionService.actualizarOrden(this.orden.id, { items: items, eliminar: this.quitados }).subscribe(
      () => {
        this.enviando = false;
        this.alertas.alertaExitoMsj('Orden actualizada');
        this.cargar();
      },
      (error: HttpErrorResponse) => {
        this.enviando = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  enviar(): void {
    if (!this.esBorrador || this.enviando || this.hayCambios()) { return; }
    swal.fire({
      title: '¿Enviar la orden N° ' + this.orden.id + '?',
      text: 'Se enviará por correo a ' + (this.orden.proveedor || 'el proveedor') + ' y ya no podrá editarse.',
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
      this.recepcionService.enviarOrden(this.orden.id).subscribe(
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

  nombreProducto(productoId: number): string {
    const linea = this.orden ? this.orden.items.filter((l) => l.producto_id === productoId)[0] : null;
    return linea && linea.producto ? linea.producto : 'Producto ' + productoId;
  }

  nombreDocumento(tipo: string): string {
    const d = this.documentos.filter((x) => x.valor === tipo)[0];
    return d ? d.nombre : tipo;
  }

  verSolicitud(id: number) {
    this.router.navigate(['/bodega/solicitudes', id]);
  }

  volver() {
    this.router.navigate(['/bodega/ordenes-compra']);
  }
}
