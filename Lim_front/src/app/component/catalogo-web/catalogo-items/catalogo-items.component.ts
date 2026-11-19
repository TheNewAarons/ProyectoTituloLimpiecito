import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { CatalogoWebService } from '../../../services/catalogo-web/catalogo-web.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { CatalogoItem } from '../../../model/catalogo-item';
import { mostrarErrorBodega as mostrarError } from '../../solicitudes-bodega/solicitudes-bodega.errores';

interface Formulario {
  id: number | null;
  nombre: string;
  categoria: string;
  precio: string;
  descripcion: string;
  publicado: boolean;
  quitar_imagen: boolean;
}

// RF-WEB-01: administración del catálogo que se publica en la web (lista, publicar, ordenar, crear/editar).
@Component({
  selector: 'app-catalogo-items',
  templateUrl: './catalogo-items.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class CatalogoItemsComponent implements OnInit {
  static readonly MAX_BYTES = 5 * 1024 * 1024;

  items: CatalogoItem[] = [];
  categorias: string[] = [];
  loading = false;
  error = false;
  guardando = false;
  form: Formulario = null;
  imagen: File = null;

  constructor(
    private catalogo: CatalogoWebService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.error = false;
    this.catalogo.listar().subscribe(
      (r) => { this.asignar(r.data); this.loading = false; },
      (e: HttpErrorResponse) => { this.loading = false; this.error = true; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  private asignar(items: CatalogoItem[]) {
    this.items = items;
    this.categorias = Array.from(new Set(items.map((i) => i.categoria).filter((c) => !!c))).sort();
  }

  urlImagen(item: CatalogoItem): string {
    return item.imagen_url ? this.catalogo.origen + item.imagen_url : null;
  }

  nuevo() {
    this.form = { id: null, nombre: '', categoria: '', precio: '', descripcion: '', publicado: false, quitar_imagen: false };
    this.imagen = null;
  }

  editar(item: CatalogoItem) {
    this.form = {
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria || '',
      precio: item.precio === null ? '' : String(item.precio),
      descripcion: item.descripcion || '',
      publicado: item.publicado,
      quitar_imagen: false
    };
    this.imagen = null;
  }

  cancelar() {
    this.form = null;
    this.imagen = null;
  }

  elegirImagen(evento: any) {
    const archivo: File = evento.target.files && evento.target.files[0];
    if (archivo && archivo.size > CatalogoItemsComponent.MAX_BYTES) {
      this.alertas.alertaErrorMsj('Imagen demasiado grande', 'La imagen no puede superar los 5 MB.');
      evento.target.value = '';
      return;
    }
    this.imagen = archivo || null;
  }

  guardar() {
    const datos = new FormData();
    datos.append('nombre', this.form.nombre);
    datos.append('categoria', this.form.categoria);
    datos.append('precio', String(this.form.precio).replace(/\D/g, ''));
    datos.append('descripcion', this.form.descripcion);
    datos.append('publicado', String(this.form.publicado));
    if (this.imagen) datos.append('imagen', this.imagen);
    else if (this.form.quitar_imagen) datos.append('quitar_imagen', 'true');

    this.guardando = true;
    const peticion = this.form.id ? this.catalogo.editar(this.form.id, datos) : this.catalogo.crear(datos);
    peticion.subscribe(
      () => {
        this.guardando = false;
        this.alertas.showNotification(this.form.id ? 'Ítem actualizado' : 'Ítem creado');
        this.cancelar();
        this.cargar();
      },
      (e: HttpErrorResponse) => { this.guardando = false; mostrarError(e, this.alertas, this.loginService); }
    );
  }

  cambiarPublicado(item: CatalogoItem) {
    const peticion = item.publicado ? this.catalogo.despublicar(item.id) : this.catalogo.editar(item.id, { publicado: true });
    peticion.subscribe(
      (r) => { item.publicado = r.data.publicado; },
      // Si falla, se recarga para que el interruptor vuelva al estado real.
      (e: HttpErrorResponse) => { mostrarError(e, this.alertas, this.loginService); this.cargar(); }
    );
  }

  mover(indice: number, paso: number) {
    const destino = indice + paso;
    if (destino < 0 || destino >= this.items.length) return;
    const ids = this.items.map((i) => i.id);
    ids.splice(destino, 0, ids.splice(indice, 1)[0]);
    this.catalogo.reordenar(ids).subscribe(
      (r) => this.asignar(r.data),
      (e: HttpErrorResponse) => { mostrarError(e, this.alertas, this.loginService); }
    );
  }
}
