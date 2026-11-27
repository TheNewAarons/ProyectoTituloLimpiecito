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

  // AUT-023 (revisión): mismas reglas que services/bodega/proveedores-formato.js. Campos opcionales: vacío es válido.
  errorRut(): string {
    const r = String(this.formulario && this.formulario.datos.rut || '').trim();
    if (!r) { return ''; }
    const limpio = r.replace(/[.\s-]/g, '').toUpperCase();
    if (!/^\d{7,8}[\dK]$/.test(limpio)) { return 'Formato de RUT no válido (ej. 76.086.428-5).'; }
    let suma = 0;
    let factor = 2;
    for (let i = limpio.length - 2; i >= 0; i--) {
      suma += Number(limpio[i]) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    return dv === limpio.slice(-1) ? '' : 'El dígito verificador no corresponde.';
  }

  errorTelefono(): string {
    const t = String(this.formulario && this.formulario.datos.telefono || '').trim();
    if (!t) { return ''; }
    if (!/^\+?[\d ]+$/.test(t)) { return 'Solo números, con + y espacios opcionales.'; }
    const digitos = t.replace(/\D/g, '').length;
    return digitos >= 8 && digitos <= 15 ? '' : 'Debe tener entre 8 y 15 dígitos (ej. +56 9 1234 5678).';
  }

  errorContacto(): string {
    const c = String(this.formulario && this.formulario.datos.contacto || '').trim();
    if (!c) { return ''; }
    const letras = (c.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]+$/.test(c) && letras >= 2 ? '' : 'Escriba el nombre de la persona (solo letras y espacios).';
  }

  // Formato para mostrar (lista) y para dejar el campo ordenado al salir de él (formulario).
  // RUT: 76086428-5 / 760864285 → 76.086.428-5. Si no parece un RUT, se deja tal cual.
  formatoRut(rut: string): string {
    const limpio = String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
    if (!/^\d{7,8}[\dK]$/.test(limpio)) { return rut || ''; }
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return cuerpo + '-' + limpio.slice(-1);
  }

  // Teléfono chileno: celular +56 9 1234 5678, fijo Santiago +56 2 1234 5678, otros +56 XX XXX XXXX.
  formatoTelefono(telefono: string): string {
    const original = String(telefono || '').trim();
    let d = original.replace(/\D/g, '');
    if (d.length === 11 && d.indexOf('56') === 0) { d = d.slice(2); }
    if (d.length !== 9) { return original; }
    if (d[0] === '9' || d[0] === '2') { return '+56 ' + d[0] + ' ' + d.slice(1, 5) + ' ' + d.slice(5); }
    return '+56 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  }

  ordenarCampo(campo: 'rut' | 'telefono'): void {
    if (!this.formulario) { return; }
    const v = this.formulario.datos[campo];
    this.formulario.datos[campo] = campo === 'rut' ? this.formatoRut(v) : this.formatoTelefono(v);
  }

  hayErroresFormulario(): boolean {
    return !!(this.errorRut() || this.errorTelefono() || this.errorContacto());
  }

  guardar(): void {
    const f = this.formulario;
    if (!f.datos.nombre || !f.datos.nombre.trim()) {
      this.alertas.alertaErrorMsj('Falta el nombre', 'El nombre del proveedor es obligatorio.');
      return;
    }
    if (this.hayErroresFormulario()) {
      this.alertas.alertaErrorMsj('Revise los datos', 'Corrija los campos marcados en rojo antes de guardar.');
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
