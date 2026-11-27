import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { ConteoDetalle, ConteoItem, ResultadoAprobacionConteo, ETIQUETA_CONTEO, BADGE_CONTEO } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';
import { nuevaPaginacion } from '../../paginacion/paginacion';

// RF-BOD-07: captura del conteo físico; aprobar (solo Administrador) genera los AJUSTE en el kardex
@Component({
  selector: 'app-conteo-detalle',
  templateUrl: './conteo-detalle.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class ConteoDetalleComponent implements OnInit {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagItems = nuevaPaginacion();
  conteo: ConteoDetalle = null;
  contadas: { [itemId: number]: number } = {};
  motivos: { [itemId: number]: string } = {};
  resultado: ResultadoAprobacionConteo = null;
  filtro = '';
  etiqueta = ETIQUETA_CONTEO;
  badge = BADGE_CONTEO;
  esAdmin = false;
  loading = false;
  enviando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    //MISMO CRITERIO QUE vista-caja: EL ROL SE COMPARA SIN DISTINGUIR MAYUSCULAS
    //EL TOKEN TRAE role AUNQUE UsuarioDetalle NO LO DECLARE
    const usuario = this.loginService.obtenerDatosUsuario() as unknown as { role?: { nombre: string } } | false;
    const nombreRol = usuario && usuario.role && usuario.role.nombre;
    this.esAdmin = !!(nombreRol && String(nombreRol).toUpperCase() === 'ADMINISTRADOR');
    this.cargar();
  }

  cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.recepcionService.obtenerConteo(id).subscribe(
      (r) => {
        this.asignar(r.data);
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  private asignar(conteo: ConteoDetalle): void {
    this.conteo = conteo;
    this.contadas = {};
    this.motivos = {};
    conteo.items.forEach((i) => {
      this.contadas[i.item_id] = i.cantidad_contada;
      this.motivos[i.item_id] = i.motivo || '';
    });
  }

  get editable(): boolean {
    return !!this.conteo && this.conteo.estado === 'BORRADOR';
  }

  get itemsVisibles(): ConteoItem[] {
    const f = this.filtro.trim().toLowerCase();
    return this.conteo ? this.conteo.items.filter((i) => !f || (i.producto || '').toLowerCase().indexOf(f) !== -1) : [];
  }

  private vacio(itemId: number): boolean {
    const v = this.contadas[itemId];
    return v === null || v === undefined || String(v) === '';
  }

  //VACIO = SIN CONTAR; SI SE INGRESA, ENTERO >= 0 (EL BACKEND VUELVE A VALIDAR)
  errorLinea(itemId: number): string {
    if (this.vacio(itemId)) { return ''; }
    const valor = Number(this.contadas[itemId]);
    return Number.isInteger(valor) && valor >= 0 ? '' : 'Ingrese un entero mayor o igual a 0';
  }

  diferencia(i: ConteoItem): number {
    if (!this.editable) { return i.diferencia; }
    return this.vacio(i.item_id) || this.errorLinea(i.item_id) ? null : Number(this.contadas[i.item_id]) - i.cantidad_teorica;
  }

  puedeGuardar(): boolean {
    return this.editable && !this.enviando && this.conteo.items.every((i) => !this.errorLinea(i.item_id));
  }

  guardar(alTerminar?: () => void): void {
    if (!this.puedeGuardar()) { return; }
    const items = this.conteo.items.map((i) => ({
      item_id: i.item_id,
      cantidad_contada: this.vacio(i.item_id) ? null : Number(this.contadas[i.item_id]),
      motivo: (this.motivos[i.item_id] || '').trim() || null
    }));
    this.enviando = true;
    this.recepcionService.capturarConteo(this.conteo.id, items).subscribe(
      (r) => {
        this.enviando = false;
        this.asignar(r.data);
        if (alTerminar) {
          alTerminar();
        } else {
          this.alertas.alertaExitoMsj('Conteo guardado', r.data.items_contados + ' producto(s) contados.');
        }
      },
      (error: HttpErrorResponse) => {
        this.enviando = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  //GUARDA LO CAPTURADO Y LUEGO APRUEBA: LA DIFERENCIA FINAL SE CALCULA CONTRA EL STOCK AL MOMENTO DE APROBAR
  aprobar(): void {
    if (!this.esAdmin || !this.puedeGuardar()) { return; }
    swal.fire({
      title: '¿Aprobar conteo?',
      text: 'Cada diferencia contra el stock actual generará un ajuste en el kardex. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      allowOutsideClick: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Aprobar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.guardar(() => {
        this.enviando = true;
        this.recepcionService.aprobarConteo(this.conteo.id).subscribe(
          (r) => {
            this.enviando = false;
            this.resultado = r.data;
            this.asignar(r.data.conteo);
            this.alertas.alertaExitoMsj('Conteo N° ' + r.data.conteo.id + ' aprobado',
              r.data.ajustes.length + ' ajuste(s) registrados en el kardex.');
          },
          (error: HttpErrorResponse) => {
            this.enviando = false;
            mostrarErrorBodega(error, this.alertas, this.loginService);
          }
        );
      });
    });
  }

  anular(): void {
    if (!this.editable || this.enviando) { return; }
    swal.fire({
      title: '¿Anular conteo?',
      text: 'El conteo quedará anulado sin modificar el stock.',
      input: 'text',
      inputPlaceholder: 'Motivo (opcional)',
      inputAttributes: { maxlength: '255' },
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-default' },
      confirmButtonText: 'Si, Anular',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (resultado.value === undefined) { return; }
      this.enviando = true;
      this.recepcionService.anularConteo(this.conteo.id, String(resultado.value || '').trim() || null).subscribe(
        (r) => {
          this.enviando = false;
          this.asignar(r.data);
        },
        (error: HttpErrorResponse) => {
          this.enviando = false;
          mostrarErrorBodega(error, this.alertas, this.loginService);
        }
      );
    });
  }

  nombreProducto(productoId: number): string {
    const item = this.conteo ? this.conteo.items.filter((i) => i.producto_id === productoId)[0] : null;
    return item && item.producto ? item.producto : 'Producto ' + productoId;
  }

  verKardex(productoId: number): void {
    this.router.navigate(['/bodega/productos', productoId, 'kardex']);
  }

  volver(): void {
    this.router.navigate(['/bodega/conteos']);
  }
}
