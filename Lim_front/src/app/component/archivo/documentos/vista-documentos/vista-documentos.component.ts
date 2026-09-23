import { Component, OnInit } from '@angular/core';

//SERVICIOS
import { DocumentoService } from 'src/app/services/documento/archivo/documento.service';
import { LoginService } from 'src/app/services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { CategoriaService } from 'src/app/services/documento/categoria/categoria.service';
import { Documento } from 'src/app/model/documento';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

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
    this.obtenerDocumentos();
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
        this.documentos = response.documentos;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //BUSCAR EN DOCUMENTOS
  buscar() {
    this.documentoService.buscarDocumentos(this.categoria, this.search).subscribe(
      (response: any) => {
        this.documentos = response.documentos;
        // console.log(this.documentos);
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
              this.obtenerDocumentos();
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
            this.obtenerDocumentos();
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
}
