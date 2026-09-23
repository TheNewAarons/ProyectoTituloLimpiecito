import { Component, OnInit } from '@angular/core';
//SERVICIOS
import { CategoriaService } from 'src/app/services/documento/categoria/categoria.service';
import { LoginService } from 'src/app/services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { Categoria } from 'src/app/model/categoria';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-vista-categorias',
  templateUrl: './vista-categorias.component.html',
  styleUrls: ['./vista-categorias.component.css']
})
export class VistaCategoriasComponent implements OnInit {
  public page = 1;
  public pageSize = 10;
  public categorias = [];
  public categoriaEdit: Categoria;
  public tipos = ['Cliente', 'Publico', 'Trabajador', 'Personalizado'];
  public usuario;

  constructor(
    private categoriaService: CategoriaService, private loginService: LoginService,
    private alertaService:AlertasService  
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerCategorias();
    this.categoriaEdit = new Categoria(null, '', '', '', null);
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER CATEGORIAS
  obtenerCategorias() {
    this.categoriaService.obtenerCategoriasActivas().subscribe(
      (response: any) => {
        this.categorias = response.categorias;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ELIMINAR CATEGORIA
  eliminarCategoria(idCategoria) {
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
        this.categoriaService.eliminarCategoria(idCategoria).subscribe(
          (response: any) => {
            if (response.eliminar) {
              this.obtenerCategorias();
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
  asignarEditar(categoria_editar) {
    this.categoriaEdit = Object.assign({}, categoria_editar);
  }
  //EDITAR CATEGORIA
  editarCategoria(valid) {
    if (valid) {
      // this.loading = !this.loading;
      this.categoriaService.editarCategoria(this.categoriaEdit, this.categoriaEdit.id).subscribe(
        (response: any) => {
          if (response.filas != 0) {
            this.obtenerCategorias();
            $('#editModal').modal('hide');
            this.alertaService.alertaExitoMsj('Categoria Editada Correctamente!')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
