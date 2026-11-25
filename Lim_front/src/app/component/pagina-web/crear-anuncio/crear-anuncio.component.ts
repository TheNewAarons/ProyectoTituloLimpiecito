import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
//SERVICIOS
import { AnuncioService } from 'src/app/services/pagina-web/anuncio.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { Publicacion } from 'src/app/model/publicacion';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

// Fecha → valor de <input type="datetime-local"> en la hora local del navegador (yyyy-MM-ddTHH:mm).
export function aInputLocal(fecha: Date | string | null): string {
  if (!fecha) { return ''; }
  const d = new Date(fecha);
  const dos = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()) + 'T' + dos(d.getHours()) + ':' + dos(d.getMinutes());
}

// Valor de datetime-local (hora local) → ISO 8601 con zona, como exige el backend. Vacío → ''.
export function aIso(valor: string): string {
  return valor ? new Date(valor).toISOString() : '';
}

// RF-WEB-03: crea o edita (ruta editar-anuncio/:id) un anuncio con fecha de publicación y expiración opcional.
@Component({
  selector: 'app-crear-anuncio',
  templateUrl: './crear-anuncio.component.html',
  styleUrls: ['./crear-anuncio.component.css']
})
export class CrearAnuncioComponent implements OnInit {

  public id: number = null;
  public titulo = '';
  public cuerpo = '';
  public fecha_publicacion = aInputLocal(new Date());
  public fecha_expiracion = '';
  public publicado = true;
  public file: File = null;
  public guardando = false;

  constructor(
    private anuncioService: AnuncioService, private router: Router,
    private route: ActivatedRoute, private alertaService: AlertasService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { return; }
    this.id = id;
    this.anuncioService.obtenerPublicacion(id).subscribe(
      (p: Publicacion) => {
        this.titulo = p.titulo;
        this.cuerpo = this.decodificarEntidades(p.cuerpo);
        this.fecha_publicacion = aInputLocal(p.fecha_publicacion);
        this.fecha_expiracion = aInputLocal(p.fecha_expiracion);
        this.publicado = p.publicado;
      },
      (error) => {
        this.alertaService.alertaErrorMsj('No se pudo cargar el anuncio', this.mensajeError(error));
        this.router.navigateByUrl('/pagina_web/anuncios');
      }
    );
  }

  // El backend guarda el cuerpo saneado (`&amp;`, `&lt;`); el textarea debe mostrar el texto tal como se escribió.
  // Un <textarea> no ejecuta nada de lo que recibe en innerHTML.
  private decodificarEntidades(html: string): string {
    const t = document.createElement('textarea');
    t.innerHTML = html || '';
    return t.value;
  }

  // Misma regla que valida el backend: la expiración debe ser posterior a la publicación.
  expiracionInvalida(): boolean {
    return !!this.fecha_expiracion && !!this.fecha_publicacion &&
      new Date(this.fecha_expiracion).getTime() <= new Date(this.fecha_publicacion).getTime();
  }

  guardar(valid: boolean): void {
    if (!valid || this.expiracionInvalida() || this.guardando) { return; }
    const fd = new FormData();
    fd.append('titulo', this.titulo);
    fd.append('cuerpo', this.cuerpo);
    fd.append('fecha_publicacion', aIso(this.fecha_publicacion));
    fd.append('fecha_expiracion', aIso(this.fecha_expiracion)); // '' = sin expiración (también la quita al editar)
    fd.append('publicado', String(this.publicado));
    if (this.file) { fd.append('imagen', this.file); }

    this.guardando = true;
    this.alertaService.loading();
    const peticion = this.id ? this.anuncioService.editarPublicacion(this.id, fd) : this.anuncioService.crearPublicacion(fd);
    peticion.subscribe(
      () => {
        this.guardando = false;
        this.alertaService.cerrarAlerta();
        this.alertaService.alertaExitoMsj(this.id ? 'Anuncio editado correctamente' : 'Anuncio creado correctamente');
        this.router.navigateByUrl('/pagina_web/anuncios');
      },
      (error) => {
        this.guardando = false;
        this.alertaService.cerrarAlerta();
        this.alertaService.alertaErrorMsj(this.id ? 'No se pudo editar el anuncio' : 'No se pudo crear el anuncio', this.mensajeError(error));
      }
    );
  }

  // Mensaje del backend v1 { error: { message, details } } (401/403 de la sesión).
  mensajeError(e): string {
    if (e && e.status === 401) { return 'Su sesión expiró. Vuelva a iniciar sesión.'; }
    if (e && e.status === 403) { return 'No tiene permiso para administrar anuncios.'; }
    const err = e && e.error && e.error.error;
    if (err && err.details && typeof err.details === 'object') {
      const detalles = Object.keys(err.details).map((k) => err.details[k]).filter((v) => typeof v === 'string');
      if (detalles.length) { return detalles.join('. '); }
    }
    if (err && err.message) { return err.message; }
    return 'Intente nuevamente.';
  }

  // Solo jpg, png o webp (lo mismo que valida el backend).
  esImagenValida(f: File): boolean {
    return !!f && ['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) !== -1;
  }

  imagenSelecionado(event: HtmlInputEvent): void {
    const f = event.target.files && event.target.files[0];
    this.file = null;
    if (!f) { return; }
    if (!this.esImagenValida(f)) {
      event.target.value = '';
      this.alertaService.alertaErrorMsj('Archivo no válido', 'El archivo debe ser una imagen jpg, png o webp.');
      return;
    }
    this.file = f;
  }

}
