import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
//SERVICIOS
import { AnuncioService } from 'src/app/services/pagina-web/anuncio.service';
import { LoginService } from '../../../services/login/login.service';
//MODELO
import { Anuncio } from 'src/app/model/anuncio';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-anuncio',
  templateUrl: './crear-anuncio.component.html',
  styleUrls: ['./crear-anuncio.component.css']
})
export class CrearAnuncioComponent implements OnInit {

  public anuncio: Anuncio;
  public file: File;
  public fd = new FormData();
  public usuario;
  constructor(
    private anuncioService: AnuncioService, private router: Router, 
    private loginService: LoginService, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.anuncio = new Anuncio(null,'', '', '', '', null);
  }

  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }

  //CREAR AUNINCIO
  crearAnuncio(valid) {
    if (!this.file) {
      this.alertaService.alertaErrorMsj('Falta la imagen', 'Seleccione una imagen jpg, png o webp para el anuncio.');
      return;
    }
    if (valid) {
      this.alertaService.loading()
      this.crearFormData(this.anuncio);
      this.anuncioService.crearAnuncio(this.fd).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.anuncio) {
            this.alertaService.alertaExitoMsj('Anuncio creado correctamente');
            this.router.navigateByUrl('/pagina_web/anuncios');
          } else if (response.mensaje) {
            this.alertaService.alertaErrorMsj('No se pudo crear el anuncio', response.mensaje);
          }
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          this.alertaService.alertaErrorMsj('No se pudo crear el anuncio', this.mensajeError(error));
        }
      );
    }
  }

  // Mensaje del backend: legacy { mensaje } o v1 { error: { message } } (401/403 de la sesión).
  mensajeError(e): string {
    if (e && e.status === 401) { return 'Su sesión expiró. Vuelva a iniciar sesión.'; }
    if (e && e.status === 403) { return 'No tiene permiso para administrar anuncios.'; }
    if (e && e.error && e.error.mensaje) { return e.error.mensaje; }
    if (e && e.error && e.error.error && e.error.error.message) { return e.error.error.message; }
    return 'Intente nuevamente.';
  }

  // Solo jpg, png o webp (lo mismo que valida el backend).
  esImagenValida(f: File): boolean {
    return !!f && ['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) !== -1;
  }

  //CREAR FORM DATA
  crearFormData(anuncio) {
    this.fd = new FormData(); // si el primer intento falló, no repetir los campos
    this.fd.append('titulo', anuncio.titulo);
    this.fd.append('sub_titulo', anuncio.sub_titulo);
    this.fd.append('descripcion', anuncio.descripcion);
    this.fd.append('imagen', this.file);    
    this.fd.append('usuarioId', this.usuario.id);
  }

  // para imagen
  imagenSelecionado(event: HtmlInputEvent) {
    if (event.target.files && event.target.files[0]) {
      this.file = event.target.files[0];
      if (!this.esImagenValida(this.file)) {
        this.file = null;
        event.target.value = '';
        this.alertaService.alertaErrorMsj('Archivo no válido', 'El archivo debe ser una imagen jpg, png o webp.');
      }
      // console.log('este es el error de file tipo',this.file);
    }
  }

}
