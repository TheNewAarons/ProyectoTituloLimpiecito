import { Component, OnInit } from '@angular/core';
import { AnuncioService } from '../../../services/pagina-web/anuncio.service';
import { Publicacion } from 'src/app/model/publicacion';

import swal from 'sweetalert2';
import { environment } from 'src/environments/environment';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { nuevaPaginacion } from '../../paginacion/paginacion';

interface AnuncioAntiguo {
  id: number;
  titulo: string;
  sub_titulo: string;
  descripcion: string;
  imagen: string;
  origen: string;
}

@Component({
  selector: 'app-anuncios',
  templateUrl: './anuncios.component.html',
  styleUrls: ['./anuncios.component.css']
})
export class AnunciosComponent implements OnInit {
  // AUT-024 (revisión): paginación de las listas que crecen con el uso
  pagPublicaciones = nuevaPaginacion();

  public url_imagen = environment.url_short;
  // imagen_url de v1 viene relativa al host (PREFIJO + ruta); el backend puede estar en otro origen (dev).
  public origen_backend = new URL(environment.url).origin;
  public publicaciones: Publicacion[] = [];
  // Anuncios del flujo antiguo (sin fechas): siguen en la web hasta que se eliminen.
  public antiguos: AnuncioAntiguo[] = [];

  constructor(public anuncioService: AnuncioService, private alertaService: AlertasService) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.anuncioService.listarPublicaciones().subscribe(
      (filas) => this.publicaciones = filas,
      (error) => this.alertaService.alertaErrorMsj('No se pudieron cargar los anuncios', this.mensajeError(error))
    );
    this.anuncioService.obtenerAnuncios().subscribe(
      (response: { anuncios: AnuncioAntiguo[] }) => this.antiguos = (response.anuncios || []).filter((a) => a.origen === 'anuncio'),
      () => this.antiguos = []
    );
  }

  // Misma regla que el backend (campo `vigente`); solo distingue por qué no se muestra.
  estado(p: Publicacion): string {
    if (!p.publicado) { return 'Despublicado'; }
    if (p.vigente) { return 'Vigente'; }
    return new Date(p.fecha_publicacion).getTime() > Date.now() ? 'Programado' : 'Expirado';
  }

  claseEstado(p: Publicacion): string {
    return { Vigente: 'badge-success', Programado: 'badge-info', Expirado: 'badge-default', Despublicado: 'badge-danger' }[this.estado(p)];
  }

  despublicar(p: Publicacion): void {
    this.confirmar('¿Despublicar "' + p.titulo + '"?', 'Dejará de mostrarse en la web. Puede volver a publicarlo editándolo.', 'Sí, despublicar', () =>
      this.anuncioService.despublicarPublicacion(p.id).subscribe(
        () => { this.cargar(); this.alertaService.alertaExitoMsj('Anuncio despublicado'); },
        (error) => this.alertaService.alertaErrorMsj('No se pudo despublicar el anuncio', this.mensajeError(error))
      )
    );
  }

  eliminarAntiguo(idAnuncio: number): void {
    this.confirmar('¿Estas seguro?', 'El anuncio antiguo se eliminará de la web.', 'Si, ¡Eliminar!', () =>
      this.anuncioService.eliminarAnuncio(idAnuncio).subscribe(
        (response: { eliminar: boolean, mensaje: string }) => {
          this.cargar();
          if (response.eliminar) { this.alertaService.alertaExitoMsj(response.mensaje); } else { this.alertaService.alertaErrorMsj(response.mensaje); }
        },
        (error) => this.alertaService.alertaErrorMsj('No se pudo eliminar el anuncio', this.mensajeError(error))
      )
    );
  }

  private confirmar(titulo: string, texto: string, boton: string, accion: () => void): void {
    swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: { confirmButton: 'btn btn-success', cancelButton: 'btn btn-danger' },
      confirmButtonText: boton,
      cancelButtonText: 'Cancelar',
    }).then((result) => { if (result.value) { accion(); } });
  }

  // Mensaje del backend: legacy { mensaje } o v1 { error: { message } } (401/403 de la sesión).
  mensajeError(e): string {
    if (e && e.status === 401) { return 'Su sesión expiró. Vuelva a iniciar sesión.'; }
    if (e && e.status === 403) { return 'No tiene permiso para administrar anuncios.'; }
    if (e && e.error && e.error.mensaje) { return e.error.mensaje; }
    if (e && e.error && e.error.error && e.error.error.message) { return e.error.error.message; }
    return 'Intente nuevamente.';
  }

}
