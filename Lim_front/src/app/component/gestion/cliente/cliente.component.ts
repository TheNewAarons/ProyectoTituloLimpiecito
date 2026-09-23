import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

//SERVICIOS
import { ClienteService } from '../../../services/cliente/cliente.service';
import { LoginService } from '../../../services/login/login.service';

//MODELOS
import { Cliente } from '../../../model/cliente';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent implements OnInit {
  constructor(
    private route: Router, private clienteService: ClienteService, 
    private loginService: LoginService, private alertaService:AlertasService
  ) {}

  public cliente: Cliente;
  public clienteEdit: Cliente;
  public clientesActivos;
  public clientesInactivos;
  public respuesta;
  public usuario;

  public searchActivo;
  public searchInactivo;

  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerClientesActivos();
    this.obtenerClientesInactivos();
    this.cliente = new Cliente(1, '', '', null, null, null, null, '', null, '0', '', 1);
    this.clienteEdit = new Cliente(1, '', '', null, null, null, null, '', null, '0', '', 1);
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //CREAR CLIENTE
  crearCliente(valid) {
    if (valid) {
      this.cliente.valor_factura = this.cliente.valor_factura.replace(/,/g, '');
      this.clienteService.crearCliente(this.cliente).subscribe(
        (response) => {
          this.cliente = new Cliente(1, '', '', null, null, null, null, '', null, '0', '', 1);
          this.obtenerClientesActivos();
          $('#createModal').modal('hide');
          this.alertaService.alertaExitoMsj('Cliente Creado Correctamente')
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
  //ASIGNAR VARIABLE A EDITAR
  asignarEditar(cliente_editar) {
    this.clienteEdit = Object.assign({}, cliente_editar);
  }
  //EDITAR CLIENTE
  editarCliente(valid) {
    if (valid) {
      this.clienteEdit.valor_factura = this.clienteEdit.valor_factura.replace(/,/g, '');
      this.clienteService.editarCliente(this.clienteEdit, this.clienteEdit.id).subscribe(
        (response) => {
          this.respuesta = response;
          this.obtenerClientesActivos();
          $('#editModal').modal('hide');
          if (this.respuesta.filas != 0) {
            this.alertaService.alertaExitoMsj('Cliente Editado Correctamente')
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
  //OBTENER CLIENTES ACTIVOS
  obtenerClientesActivos() {
    this.clienteService.obtenerClientesActivos().subscribe(
      (response) => {
        this.respuesta = response;
        this.clientesActivos = this.respuesta.clientes;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //OBTENER CLIENTES INACTIVOS
  obtenerClientesInactivos() {
    this.clienteService.obtenerClientesInactivos().subscribe(
      (response) => {
        this.respuesta = response;
        this.clientesInactivos = this.respuesta.clientes;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //ELIMINAR CLIENTE(CAMBIO DE ESTADO)
  eliminarCliente(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a desactivar a este Cliente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.clienteService.eliminarCliente(id).subscribe(
          (response) => {
            this.obtenerClientesActivos();
            this.obtenerClientesInactivos();
            this.alertaService.alertaExitoMsj('Cliente Ha Sido Desactivado')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
  //ACTIVAR CLIENTE(CAMBIO DE ESTADO)
  activarCliente(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a activar a este Cliente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.clienteService.activarCliente(id).subscribe(
          (response) => {
            this.obtenerClientesActivos();
            this.obtenerClientesInactivos();
            this.alertaService.alertaExitoMsj('Cliente Ha Sido Activado')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }

  //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  };

  //BUSCAR CLIENTES ACTIVOS
  buscarActivo() {
    this.clienteService.buscarActivos(this.searchActivo).subscribe(
      (response) => {
        this.respuesta = response;
        this.clientesActivos = this.respuesta.clientes;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //BUSCAR CLIENTES INACTIVOS
  buscarInactivo() {
    this.clienteService.buscarInactivos(this.searchInactivo).subscribe(
      (response) => {
        this.respuesta = response;
        this.clientesInactivos = this.respuesta.clientes;
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
