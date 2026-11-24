import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/documento';
  }

  //CREAR DOCUMENTO
  crearDocumento(documento) {
    return this.http.post(this.url_backend + '/crear', documento);
  }
  //EDITAR DOCUMENTO
  editarDocumento(documento, idDocumento) {
    return this.http.put(this.url_backend + '/editar/' + idDocumento, documento);
  }

  //ELIMINAR DOCUMENTO
  eliminarDocumento(idDocumento) {
    return this.http.delete(this.url_backend + '/eliminar/' + idDocumento);
  }
  //OBTENER DOCUMENTOS
  obtenerDocumentos() {
    return this.http.get(this.url_backend + '/obtener-documentos');
  }
  //OBTENER UN DOCUMENTO
  obtenerDocumento(idDocumento) {
    return this.http.get(this.url_backend + '/obtener-documento/' + idDocumento);
  }
  //DESCARGAR PDF
  descargarPdf(idDocumento) {
    return this.http.get(this.url_backend + '/descargar-pdf/' + idDocumento, {
      responseType: 'blob'
    });
  }
  //CONTENIDO DEL PDF CON SESIÓN (RNF-SEC-01, AUT-015): GET /api/v1/documentos/:id/contenido
  obtenerContenido(idDocumento, token: string) {
    return this.http.get(environment.url + '/api/v1/documentos/' + idDocumento + '/contenido', {
      responseType: 'blob',
      headers: new HttpHeaders({ 'x-access-token': token || '' })
    });
  }

  //BUSCAR EN DOCUMENTOS
  buscarDocumentos(categoria, search) {
    return this.http.get(this.url_backend + '/buscar-documento/' + categoria + '/' + search);
  }
}
