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
    if (valid) {
      this.alertaService.loading()
      this.crearFormData(this.anuncio);
      this.anuncioService.crearAnuncio(this.fd).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.anuncio) {
            this.router.navigateByUrl('/pagina_web/anuncios');
          }
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }

  //CREAR FORM DATA
  crearFormData(anuncio) {
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
      if (this.file.type === 'application/pdf') {
        this.file = null;
        alert('Debe subir una imagen');
      }
      // console.log('este es el error de file tipo',this.file);
    }
  }

}
