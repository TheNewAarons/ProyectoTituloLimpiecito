import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ClienteService } from 'src/app/services/cliente/cliente.service';

@Component({
  selector: 'app-ver-clientes',
  templateUrl: './ver-clientes.component.html',
  styleUrls: ['./ver-clientes.component.css']
})
export class VerClientesComponent implements OnInit {

  clientes
  activo:boolean = true
  search= ''
  page = 1;
  pageSize = 12;

  constructor(
    private alertaService:AlertasService, private clienteService:ClienteService
  ) { }

  ngOnInit() {
    this.obtenerClientes()
  }

  obtenerClientes(){
    if(this.activo){
      this.clienteService.obtenerClientesActivos().subscribe(
        (response:any) => {
          this.clientes = response.clientes;
        },
        (error) => {
          console.log(error);
        }
      );
    }else{
      this.clienteService.obtenerClientesInactivos().subscribe(
        (response:any) => {
          this.clientes = response.clientes;
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }

  cambiar(){
    this.activo = !this.activo
    this.obtenerClientes()
  }

  buscarClientes(){
    if(this.activo){
      this.clienteService.buscarActivos(this.search).subscribe(
        (response:any) => {
          this.clientes = response.clientes;
        },
        (error) => {
          console.log(error);
        }
      );
    }else{
      this.clienteService.buscarInactivos(this.search).subscribe(
        (response:any) => {
          this.clientes = response.clientes;
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }



}
