import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
//SERVICIO
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { AsociacionService } from 'src/app/services/documento/asociacion/asociacion.service';

import { saveAs } from 'file-saver';
import { LoginService } from 'src/app/services/login/login.service';

@Component({
  selector: 'app-ver-documento',
  templateUrl: './ver-documento.component.html',
  styleUrls: ['./ver-documento.component.css']
})
export class VerDocumentoComponent implements OnInit {
  public idDocumento;
  public documento;
  public url_documento;
  public asoc_clientes = [];
  public asoc_trabajadores = [];

  public pdf: Blob = null;
  public errorArchivo = '';

  constructor(private documentoService: DocumentoService, private route: ActivatedRoute, private asociacionService: AsociacionService,
    private loginService: LoginService) {}

  ngOnInit() {
    this.obtenerId();
  }

  ngOnDestroy() {
    if (this.url_documento) { URL.revokeObjectURL(this.url_documento); }
  }

  // RNF-SEC-01 (AUT-015): el PDF se pide con sesión y se muestra desde una URL local (blob:), no desde /uploads.
  cargarPdf() {
    this.errorArchivo = '';
    this.documentoService.obtenerContenido(this.idDocumento, this.loginService.getToken()).subscribe(
      (blob: Blob) => {
        this.pdf = blob;
        this.url_documento = URL.createObjectURL(blob);
      },
      (error) => {
        this.errorArchivo = error && error.status === 404 ? 'El archivo de este documento no está disponible.' :
          error && (error.status === 401 || error.status === 403) ? 'No tienes permiso para ver este documento.' : 'No se pudo cargar el documento.';
      }
    );
  }

  //OBTENER ID DOCUMENTO
  obtenerId() {
    this.idDocumento = this.route.snapshot.paramMap.get('idDocumento');
    this.obtenerDocumento(this.idDocumento);
    this.obtenerAsocTrabajadores();
  }

  //BUSCAR INFORMACION DE DOCUMENTO
  obtenerDocumento(idDocumento) {
    this.documentoService.obtenerDocumento(idDocumento).subscribe(
      (response: any) => {
        this.documento = response.documento;
        this.cargarPdf();
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //OBTENER ASOC TRABAJADORES
  obtenerAsocTrabajadores() {
    this.asociacionService.obtenerAsocTrabajador(this.idDocumento).subscribe(
      (response: any) => {
        this.asoc_trabajadores = response.asociaciones;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //DESCARGAR PDF
  descargar() {
    if (this.pdf) { saveAs(this.pdf, this.documento.nombre); return; }
    this.documentoService.obtenerContenido(this.idDocumento, this.loginService.getToken()).subscribe(
      (response: any) => {
        saveAs(response, this.documento.nombre);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ELIMINAR ASOCIACION TRABAJADOR
  eliminarAsoTrabajador(id) {
    this.asociacionService.eliminarAsocDocTra(id).subscribe(
      (response: any) => {
        if (response.cant > 0) {
          this.obtenerAsocTrabajadores();
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
