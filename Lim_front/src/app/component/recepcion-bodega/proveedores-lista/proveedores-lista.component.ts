import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import swal from 'sweetalert2';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { Proveedor, DatosProveedor } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-03: CRUD de proveedores (crear, listar, editar, desactivar). Desactivar es baja lógica.
@Component({
  selector: 'app-proveedores-lista',
  templateUrl: './proveedores-lista.component.html'
})
export class ProveedoresListaComponent implements OnInit {
  proveedores: Proveedor[] = [];
  filtros: { valor: number, nombre: string }[] = [
    { valor: 1, nombre: 'Activos' },
    { valor: 0, nombre: 'Inactivos' },
    { valor: null, nombre: 'Todos' }
  ];
  activo = 1;
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;
  guardando = false;
  // null = formulario cerrado; id null = creando
  formulario: { id: number, datos: DatosProveedor } = null;

  constructor(
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.recepcionService.listarProveedores(this.activo, this.page, this.pageSize).subscribe(
      (r) => {
        this.proveedores = r.data;
        this.total = r.meta.total || 0;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        this.proveedores = [];
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  filtrar(): void {
    this.page = 1;
    this.cargar();
  }

  nuevo(): void {
    this.formulario = { id: null, datos: { nombre: '', rut: '', email: '', telefono: '', contacto: '' } };
  }

  editar(p: Proveedor): void {
    this.formulario = {
      id: p.id,
      datos: { nombre: p.nombre, rut: p.rut || '', email: p.email || '', telefono: p.telefono || '', contacto: p.contacto || '' }
    };
  }

  cancelar(): void {
    this.formulario = null;
  }

  guardar(): void {
    const f = this.formulario;
    if (!f.datos.nombre || !f.datos.nombre.trim()) {
      this.alertas.alertaErrorMsj('Falta el nombre', 'El nombre del proveedor es obligatorio.');
      return;
    }
    this.guardando = true;
    const peticion = f.id === null
      ? this.recepcionService.crearProveedor(f.datos)
      : this.recepcionService.editarProveedor(f.id, f.datos);
    peticion.subscribe(
      () => {
        this.guardando = false;
        this.alertas.alertaExitoMsj(f.id === null ? 'Proveedor creado' : 'Proveedor actualizado');
        this.formulario = null;
        this.cargar();
      },
      (error: HttpErrorResponse) => {
        this.guardando = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  desactivar(p: Proveedor): void {
    swal.fire({
      title: '¿Desactivar proveedor?',
      text: p.nombre + ' dejará de aparecer como activo. No se borra y sus órdenes se conservan.',
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Desactivar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.recepcionService.desactivarProveedor(p.id).subscribe(
        () => {
          this.alertas.alertaExitoMsj('Proveedor desactivado');
          this.cargar();
        },
        (error: HttpErrorResponse) => mostrarErrorBodega(error, this.alertas, this.loginService)
      );
    });
  }

  reactivar(p: Proveedor): void {
    swal.fire({
      title: '¿Reactivar proveedor?',
      text: p.nombre + ' volverá a estar disponible para órdenes de compra.',
      icon: 'question',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: 'Si, Reactivar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.value) { return; }
      this.recepcionService.reactivarProveedor(p.id).subscribe(
        () => {
          this.alertas.alertaExitoMsj('Proveedor reactivado');
          this.cargar();
        },
        (error: HttpErrorResponse) => mostrarErrorBodega(error, this.alertas, this.loginService)
      );
    });
  }
}
