import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// SERVICIOS
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { DocumentoPublicoService } from 'src/app/services/documento-publico/documento-publico.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { DocumentoArchivo, RespuestaArchivo } from 'src/app/model/documento-publico';

@Component({
  selector: 'app-documentos-publicos',
  templateUrl: './documentos-publicos.component.html'
})
export class DocumentosPublicosComponent implements OnInit {
  public documentos: DocumentoArchivo[] = [];
  public publicando: { [id: number]: boolean } = {};

  constructor(
    private documentoService: DocumentoService,
    private documentoPublicoService: DocumentoPublicoService,
    private alertaService: AlertasService
  ) {}

  ngOnInit(): void {
    this.obtenerDocumentos();
  }

  // Listado legacy (obtener-documentos): se castea al tipo explícito, sin `any`.
  obtenerDocumentos(): void {
    this.documentoService.obtenerDocumentos().subscribe(
      (response: { documentos: DocumentoArchivo[] }) => {
        this.documentos = response.documentos;
      },
      (error: HttpErrorResponse) => {
        this.alertaService.alertaErrorMsj('No se pudieron cargar los documentos');
      }
    );
  }

  cambiarPublico(documento: DocumentoArchivo): void {
    const id = documento.id;
    const previo = documento.publico;
    this.publicando[id] = true;
    documento.publico = !previo;

    this.documentoPublicoService.publicar(id, documento.publico).subscribe(
      (response: RespuestaArchivo<DocumentoArchivo>) => {
        this.publicando[id] = false;
        documento.publico = response.data.publico;
        documento.fecha_publicacion = response.data.fecha_publicacion;
        this.alertaService.showNotification(response.data.publico ? 'Documento publicado' : 'Documento despublicado');
      },
      (error: HttpErrorResponse) => {
        this.publicando[id] = false;
        documento.publico = previo;
        const mensaje = error.error && error.error.error ? error.error.error.message : 'No se pudo actualizar el documento';
        this.alertaService.alertaErrorMsj(mensaje);
      }
    );
  }
}
