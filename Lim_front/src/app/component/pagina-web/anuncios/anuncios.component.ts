import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Anuncio } from 'src/app/model/anuncio';
import { AnuncioService } from '../../../services/pagina-web/anuncio.service';

import swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

declare var $: any;

@Component({
  selector: 'app-anuncios',
  templateUrl: './anuncios.component.html',
  styleUrls: ['./anuncios.component.css']
})
export class AnunciosComponent implements OnInit {

  public url_imagen = environment.url_short;
  public anuncios;
  public cant_anuncios;
  public anuncioEdit: Anuncio;

  constructor(
    public router: Router,public _route: ActivatedRoute,
    public anuncioService: AnuncioService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.mostrarAnuncio()
    this.anuncioEdit = new Anuncio(null,'','','','',null);
  }

  mostrarAnuncio(){
    this.anuncioService.obtenerAnuncios().subscribe(
      (response: any) => {
        this.anuncios = response.anuncios;
        this.cant_anuncios = response.cant_anuncios;
      },
      (error) => {
        console.log(error);
      }
    );
    
  }

  //ELIMINAR ANUNCIO
  eliminarAnuncio(idAnuncio) {
    swal.fire({
      title: '¿Estas seguro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.anuncioService.eliminarAnuncio(idAnuncio).subscribe(
          (response: any) => {
            if (response.eliminar) {
              this.mostrarAnuncio();
              this.alertaService.alertaExitoMsj(response.mensaje)
            } else {
              this.alertaService.alertaErrorMsj(response.mensaje)
            }
          },
          (error) => {
            this.alertaService.alertaErrorMsj('No se pudo eliminar el anuncio', this.mensajeError(error));
          }
        );
      }
    });
  }

  // Obs. 23 (AUT-019): Editar compara con el original y permite cambiar la imagen.
  public anuncioOriginal: any = null;
  public imagenNueva: File = null;

  //ASIGNAR VARIABLE PARA EDITAR
  asignarEditar(anuncio_editar) {
    this.anuncioEdit = Object.assign({}, anuncio_editar);
    this.anuncioOriginal = Object.assign({}, anuncio_editar);
    this.limpiarImagenNueva();
  }

  textosCambiados(): boolean {
    const o = this.anuncioOriginal;
    const e: any = this.anuncioEdit;
    if (!o || !e) { return false; }
    return ['titulo', 'sub_titulo', 'descripcion'].some((k) => String(e[k] || '').trim() !== String(o[k] || '').trim());
  }

  // El botón Editar se habilita solo si cambió algún texto o se eligió una imagen nueva.
  hayCambios(): boolean {
    return this.textosCambiados() || !!this.imagenNueva;
  }

  imagenEditarSeleccionada(event) {
    const f: File = event.target.files && event.target.files[0];
    if (!f) { this.imagenNueva = null; return; }
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) === -1) {
      this.limpiarImagenNueva();
      this.alertaService.alertaErrorMsj('Archivo no válido', 'La imagen debe ser jpg, png o webp.');
      return;
    }
    this.imagenNueva = f;
  }

  limpiarImagenNueva() {
    this.imagenNueva = null;
    const input = document.getElementById('imagenEditarAnuncio') as HTMLInputElement;
    if (input) { input.value = ''; }
  }

  // Mensaje del backend: legacy { mensaje } o v1 { error: { message } } (401/403 de la sesión).
  mensajeError(e): string {
    if (e && e.status === 401) { return 'Su sesión expiró. Vuelva a iniciar sesión.'; }
    if (e && e.status === 403) { return 'No tiene permiso para administrar anuncios.'; }
    if (e && e.error && e.error.mensaje) { return e.error.mensaje; }
    if (e && e.error && e.error.error && e.error.error.message) { return e.error.error.message; }
    return 'Intente nuevamente.';
  }

  //EDITAR DOCUMENTO
  // Primero los textos y luego la imagen: si la imagen falla, los textos ya quedaron guardados y se avisa.
  editarAnuncio(valid) {
    if (!valid || !this.hayCambios()) { return; }
    const terminar = () => {
      this.limpiarImagenNueva();
      this.mostrarAnuncio();
      $('#editModal').modal('hide');
      this.alertaService.alertaExitoMsj('Anuncio Editado Correctamente');
    };
    const subirImagen = () => {
      const fd = new FormData();
      fd.append('imagen', this.imagenNueva);
      this.anuncioService.reemplazarImagen(this.anuncioEdit.id, fd).subscribe(
        () => terminar(),
        (error) => {
          this.mostrarAnuncio();
          this.alertaService.alertaErrorMsj('No se pudo cambiar la imagen', this.mensajeError(error));
        }
      );
    };
    if (!this.textosCambiados()) { subirImagen(); return; }
    this.anuncioService.editarAnuncio(this.anuncioEdit, this.anuncioEdit.id).subscribe(
      (response: any) => {
        // Como antes: sin filas actualizadas (p. ej. el anuncio ya no existe) no se informa éxito.
        if (!response || response.filas == 0) {
          this.mostrarAnuncio();
          this.alertaService.alertaErrorMsj('No se pudo editar el anuncio', 'El anuncio ya no existe o no se pudo actualizar. Recargue la página.');
          return;
        }
        if (this.imagenNueva) { subirImagen(); } else { terminar(); }
      },
      (error) => this.alertaService.alertaErrorMsj('No se pudo editar el anuncio', this.mensajeError(error))
    );
  }
  

}
