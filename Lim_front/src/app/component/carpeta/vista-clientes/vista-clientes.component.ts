import { Component, OnInit } from '@angular/core';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';

@Component({
  selector: 'app-vista-clientes',
  templateUrl: './vista-clientes.component.html',
  styleUrls: ['./vista-clientes.component.css']
})
export class VistaClientesComponent implements OnInit {

  clientes = []
  busca = null
  public page = 1;
  public pageSize = 12;

  constructor(private carpetaService:CarpetaService, private alertaService:AlertasService) { }

  ngOnInit() {
    this.obtenerClientes();
  }

  //OBTENER CLIENTES ACTIVOS CON CARPETA
  obtenerClientes(){
    this.alertaService.loading()
    this.carpetaService.obtenerClientes().subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.clientes = response.clientes
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )
  }

  //CREAR CARPETA PADRE
  crearCarpetaPadre(id_cliente){
    this.alertaService.loading()
    this.carpetaService.crearCarpetaPadre(id_cliente).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        if(response.carpeta_padre){
          this.alertaService.showNotification('Iniciación de carpetas se ha realizado con éxito')
          this.obtenerClientes()
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )

  }
  //BUSCAR EN CLIENTES
  buscarCliente(){
    this.alertaService.loading()
    this.carpetaService.buscarCliente(this.busca).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.clientes = response.clientes
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )
  }

}
