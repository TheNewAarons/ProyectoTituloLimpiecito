import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
//SERVICIO
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { AsociacionService } from 'src/app/services/documento/asociacion/asociacion.service';

import { saveAs } from 'file-saver';
import { environment } from 'src/environments/environment';

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

  constructor(private documentoService: DocumentoService, private route: ActivatedRoute, private asociacionService: AsociacionService) {}

  ngOnInit() {
    this.obtenerId();
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
        this.url_documento = environment.url_short + this.documento.url;
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
    this.documentoService.descargarPdf(this.idDocumento).subscribe(
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
