import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';

//SERVICIOS
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { CategoriaService } from 'src/app/services/documento/categoria/categoria.service';
//MODELO
import { Documento } from 'src/app/model/documento';

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-documento',
  templateUrl: './crear-documento.component.html',
  styleUrls: ['./crear-documento.component.css']
})
export class CrearDocumentoComponent implements OnInit {
  public documento: Documento;
  public categorias = [];
  public file: File;
  public categoriasListo = true;
  public fd = new FormData();

  constructor(private documentoService: DocumentoService, private router: Router, private categoriaService: CategoriaService) {}

  ngOnInit() {
    this.obtenerCategorias();
    this.documento = new Documento(null, '', null, '', true, null);
  }

  obtenerCategorias() {
    this.categoriaService.obtenerCategoriasActivas().subscribe(
      (response: any) => {
        this.categorias = response.categorias;
        this.categoriasListo = false;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  pdfSelecionado(event: HtmlInputEvent) {
    if (event.target.files && event.target.files[0]) {
      this.file = event.target.files[0];
      if (this.file.type != 'application/pdf') {
        this.file = null;
        alert('Suba un Archivo PDF');
      }
    }
  }
  //CREAR FORM DATA
  crearFormData(documento) {
    this.fd.append('nombre', documento.nombre);
    this.fd.append('pdf', this.file);
    this.fd.append('fecha_subida', formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US'));
    this.fd.append('estado', documento.estado);
    this.fd.append('categoriaDocumentoId', documento.categoriaDocumentoId);
  }

  //CREAR DOCUMENTO
  crearDocumento(valid) {
    if (valid) {
      this.crearFormData(this.documento);
      this.documentoService.crearDocumento(this.fd).subscribe(
        (response: any) => {
          if (response.documento) {
            this.router.navigateByUrl('/archivo/documentos');
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
