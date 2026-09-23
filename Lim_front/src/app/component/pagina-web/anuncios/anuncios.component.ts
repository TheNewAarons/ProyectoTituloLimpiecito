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
            console.log(error);
          }
        );
      }
    });
  }

  //ASIGNAR VARIABLE PARA EDITAR
  asignarEditar(anuncio_editar) {
    this.anuncioEdit = Object.assign({}, anuncio_editar);
  }

  //EDITAR DOCUMENTO
  editarAnuncio(valid) {
    if (valid) {
      this.anuncioService.editarAnuncio(this.anuncioEdit, this.anuncioEdit.id).subscribe(
        (response: any) => {
          if (response.filas != 0) {
            this.mostrarAnuncio();
            $('#editModal').modal('hide');
            this.alertaService.alertaExitoMsj('Anuncio Editado Correctamente')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
  

}
