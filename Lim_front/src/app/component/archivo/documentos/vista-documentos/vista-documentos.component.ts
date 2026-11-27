import { Component, OnInit } from '@angular/core';

//SERVICIOS
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { LoginService } from 'src/app/services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { CategoriaService } from 'src/app/services/documento/categoria/categoria.service';
import { Documento } from 'src/app/model/documento';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-vista-documentos',
  templateUrl: './vista-documentos.component.html',
  styleUrls: ['./vista-documentos.component.css']
})
export class VistaDocumentosComponent implements OnInit {
  public page = 1;
  public pageSize = 15;
  public documentos = [];
  public search = '';
  public categorias = ['Todos'];
  public categoria = 'Todos';
  public categoriasListo = true;
  public documentoEdit: Documento;
  public preCategorias;
  public usuario;

  constructor(
    private documentoService: DocumentoService, private categoriaService: CategoriaService,
    private loginService: LoginService, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.refrescar();
    this.obtenerCategorias();
    this.documentoEdit = new Documento(null, '', null, '', null, null);
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER CATEGORIA
  obtenerCategorias() {
    this.categoriaService.obtenerCategoriasActivas().subscribe(
      (response: any) => {
        this.preCategorias = response.categorias;
        let preview_cate = response.categorias.map((x) => {
          return x.nombre;
        });
        preview_cate.forEach((element) => {
          this.categorias = [...this.categorias, element];
        });
        this.categoriasListo = false;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //OBTENER DOCUMENTOS
  obtenerDocumentos() {
    this.documentoService.obtenerDocumentos().subscribe(
      (response: any) => {
        this.asignarDocumentos(response.documentos);
      },
      (error) => {
        console.log(error);
      }
    );
  }
  // Ajusta la página si la lista quedó más corta (p. ej. tras eliminar o filtrar), para no mostrar una página vacía.
  private asignarDocumentos(documentos): void {
    this.documentos = documentos || [];
    const ultimaPagina = Math.max(1, Math.ceil(this.documentos.length / this.pageSize));
    if (this.page > ultimaPagina) { this.page = ultimaPagina; }
  }
  // Cambio de filtro o búsqueda hecho por el usuario: vuelve a la primera página.
  filtrar(): void {
    this.page = 1;
    this.buscar();
  }
  // Recarga la lista respetando el filtro de categoría y la búsqueda activos (tras editar/eliminar).
  refrescar(): void {
    if (this.categoria === 'Todos' && !this.search) {
      this.obtenerDocumentos();
    } else {
      this.buscar();
    }
  }
  //BUSCAR EN DOCUMENTOS
  buscar() {
    this.documentoService.buscarDocumentos(this.categoria, this.search).subscribe(
      (response: any) => {
        this.asignarDocumentos(response.documentos);
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //ELIMINAR DOCUMENTO
  eliminarDocumento(idDocumento) {
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
        this.documentoService.eliminarDocumento(idDocumento).subscribe(
          (response: any) => {
            if (response.eliminar) {
              this.refrescar();
              this.alertaService.alertaExitoMsj('Eliminado')
            } else {
              this.alertaService.alertaExitoMsj(response.mensaje)
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
  asignarEditar(documento_editar) {
    this.documentoEdit = Object.assign({}, documento_editar);
  }
  //EDITAR DOCUMENTO
  editarDocumento(valid) {
    if (valid) {
      this.documentoService.editarDocumento(this.documentoEdit, this.documentoEdit.id).subscribe(
        (response: any) => {
          if (response.filas != 0) {
            this.refrescar();
            $('#editModal').modal('hide');
            this.alertaService.alertaExitoMsj('Documento Editado Correctamente!')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

  //REEMPLAZAR ARCHIVO AL EDITAR (RF-010.2): opcional; si se eligió un PDF, se guardan nombre/categoría y luego se reemplaza.
  public archivoNuevo: File = null;
  @ViewChild('archivoEditar', { static: false }) archivoEditar: ElementRef;

  // Obs. 19: el botón Editar solo se habilita si cambió el nombre, la categoría o se eligió un archivo nuevo.
  public edicionOriginal = { nombre: '', categoriaDocumentoId: null };

  prepararEdicion(documento) {
    this.edicionOriginal = { nombre: String(documento.nombre || '').trim(), categoriaDocumentoId: documento.categoriaDocumentoId };
    this.limpiarArchivoNuevo();
  }

  hayCambios(): boolean {
    const d = this.documentoEdit || ({} as any);
    return !!this.archivoNuevo
      || String(d.nombre || '').trim() !== this.edicionOriginal.nombre
      || d.categoriaDocumentoId !== this.edicionOriginal.categoriaDocumentoId;
  }

  limpiarArchivoNuevo() {
    this.archivoNuevo = null;
    if (this.archivoEditar) { this.archivoEditar.nativeElement.value = ''; }
  }

  seleccionarArchivoNuevo(event: any) {
    const archivo: File = event.target.files && event.target.files[0];
    if (!archivo) { this.archivoNuevo = null; return; }
    if (archivo.type != 'application/pdf') {
      this.limpiarArchivoNuevo();
      this.alertaService.alertaErrorMsj('Archivo no permitido', 'El archivo debe ser un PDF.');
      return;
    }
    this.archivoNuevo = archivo;
  }

  // Reemplazar el archivo es solo para Administrador (PUT /api/v1/archivos/:id/archivo); sin distinguir mayúsculas.
  esAdmin(): boolean {
    const rol = this.usuario && this.usuario.role ? String(this.usuario.role.nombre) : '';
    return rol.toUpperCase() === 'ADMINISTRADOR';
  }

  private mensajeError(error, porDefecto: string): string {
    const e = error && error.error;
    if (e && e.error && e.error.message) { return e.error.message; } // formato /api/v1
    if (e && e.mensaje) { return e.mensaje; }                     // formato legacy de /documento
    return porDefecto;
  }

  // Primero nombre/categoría y luego el archivo: si algo falla, el archivo no queda cambiado a medias (revisor).
  guardarEdicion(valid) {
    if (!valid || !this.hayCambios()) { return; }
    if (!this.archivoNuevo) { this.editarDocumento(valid); return; }
    this.documentoService.editarDocumento(this.documentoEdit, this.documentoEdit.id).subscribe(
      () => {
        const fd = new FormData();
        fd.append('pdf', this.archivoNuevo);
        this.documentoService.reemplazarArchivo(this.documentoEdit.id, fd, this.loginService.getToken()).subscribe(
          () => {
            this.limpiarArchivoNuevo();
            this.refrescar();
            $('#editModal').modal('hide');
            this.alertaService.alertaExitoMsj('Documento actualizado', 'El archivo fue reemplazado correctamente.');
          },
          (error) => {
            this.refrescar();
            this.alertaService.alertaErrorMsj('No se pudo reemplazar el archivo', this.mensajeError(error, 'El documento conserva su archivo anterior.'));
          }
        );
      },
      (error) => this.alertaService.alertaErrorMsj('No se pudo guardar el documento', this.mensajeError(error, 'Intenta nuevamente.'))
    );
  }
}
