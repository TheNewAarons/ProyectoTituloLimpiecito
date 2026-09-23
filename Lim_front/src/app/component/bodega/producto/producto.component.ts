import { Component, OnInit } from '@angular/core';
//SERVICIOS
import { ProductoService } from '../../../services/producto/producto.service';
import { LoginService } from '../../../services/login/login.service';

//MODELOS
import { Producto } from './../../../model/producto';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-producto',
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css']
})
export class ProductoComponent implements OnInit {
  public producto: Producto; //Instancia para la creacion de producto nuevo
  public productos; //Almacena productos
  public productosInactivos; // Almacena productos inactivos
  public respuesta; // respuesta de peticiones
  public usuario;
  public productoEdit;
  public searchActivo;
  public searchInactivo;

  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  public loading: Boolean = false;

  constructor(
    private productoService: ProductoService, private loginService: LoginService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerProductos();
    this.obtenerProductosInactivos();
    this.producto = new Producto(1, '', '', 1, 1, '0', '0');
    this.productoEdit = new Producto(1, '', '', 1, 1, '0', '0');
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //CREAR PRODUCTO
  crearProducto(valid) {
    if (valid) {
      this.loading = !this.loading;
      this.producto.stock = this.producto.stock.replace(/,/g, '');
      this.producto.precio = this.producto.precio.replace(/,/g, '');
      this.productoService.crearProducto(this.producto).subscribe(
        (response: any) => {
          if (response.producto) {
            this.producto = new Producto(1, '', '', 1, 1, '0', '0');
            this.obtenerProductos();
            $('#createModal').modal('hide');
            this.alertaService.alertaExitoMsj('Producto Creado Correctamante')
          } else {
            this.loading = !this.loading;
            this.alertaService.alertaExitoMsj('Por favor escriba otro nombre para el producto')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
  //OBTENER PRODUCTOS ACTIVOS
  obtenerProductos() {
    this.productoService.obtenerProductos().subscribe(
      (response: any) => {
        this.productos = response.productos;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //OBTENER PRODUCTOS INACTIVOS
  obtenerProductosInactivos() {
    this.productoService.obtenerProductosInactivos().subscribe(
      (response: any) => {
        this.productosInactivos = response.productosInactivos;
        this.loading = !this.loading;
        //console.log(response);
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //ELIMINAR PRODUCTO
  eliminarProducto(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.productoService.eliminarProducto(id).subscribe(
          (response: any) => {
            this.obtenerProductos();
            this.obtenerProductosInactivos();
            this.alertaService.alertaExitoMsj('Tu producto ha sido desactivado.')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
  //ACTIVAR PRODUCTO
  activarProducto(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.productoService.activarProducto(id).subscribe(
          (response: any) => {
            this.obtenerProductos();
            this.obtenerProductosInactivos();
            this.alertaService.alertaExitoMsj('Tu Producto Ha Sido Activado.')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
  //BORRAR PRODUCTO
  borrarProducto(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Borrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.productoService.borrarProducto(id).subscribe(
          (response: any) => {
            this.obtenerProductos();
            this.obtenerProductosInactivos();
            this.alertaService.alertaExitoMsj('Tu Producto Ha Sido Borrado.')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }

  //ASIGNAR VARIABLE PARA EDITAR
  asignarEditar(producto_editar) {
    this.productoEdit = Object.assign({}, producto_editar);
  }
  //EDITAR PRODUCTO
  editarProducto(valid) {
    if (valid) {
      this.loading = !this.loading;
      this.productoEdit.stock = this.productoEdit.stock.replace(/,/g, '');
      this.productoEdit.precio = this.productoEdit.precio.replace(/,/g, '');
      this.productoService.editarProducto(this.productoEdit, this.productoEdit.id).subscribe(
        (response: any) => {
          if (response.filas > 0) {
            this.obtenerProductos();
            $('#editModal').modal('hide');
            this.alertaService.alertaExitoMsj('Producto Editado Correctamente!')
          } else {
            this.loading = !this.loading;
            this.alertaService.alertaExitoMsj('Por favor escriba otro nombre para el producto')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
  //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  };

  //BUSCAR EN PRODUCTOS ACTIVOS
  buscarActivo() {
    this.loading = !this.loading;
    this.productoService.buscarActivos(this.searchActivo).subscribe(
      (response: any) => {
        this.productos = response.productos;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //BUSCAR EN PRODUCTOS INACTIVOS
  buscarInactivo() {
    this.loading = !this.loading;
    this.productoService.buscarInactivos(this.searchInactivo).subscribe(
      (response: any) => {
        this.productosInactivos = response.productosInactivos;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
