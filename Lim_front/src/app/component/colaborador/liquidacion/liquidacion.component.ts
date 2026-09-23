import { Component, OnInit } from '@angular/core';

//SERVICIOS
import { LiquidacionService } from '../../../services/liquidacion/liquidacion.service'; 

@Component({
  selector: 'app-liquidacion',
  templateUrl: './liquidacion.component.html',
  styleUrls: ['./liquidacion.component.css']
})
export class LiquidacionComponent implements OnInit {

  public respuesta;
  public centroTrabajadores;
  public searchActivo;
  public page = 1;
  public pageSize = 12;

  constructor(
    private liquidacionService:LiquidacionService
  ) { }

  ngOnInit() {
    this.obtenerLiquidaciones();
  }

  //OBTENER LIQUIDACIONES
  obtenerLiquidaciones(){
    this.liquidacionService.obtenerLiquidaciones().subscribe(
      response => {
        this.respuesta = response;
        this.centroTrabajadores = this.respuesta.centroTrabajadores;
      },
      error => {
        console.log(error);
      }
    )
  }
  //BUSCADOR 
  buscar(){
    this.liquidacionService.obtenerBusqueda(this.searchActivo).subscribe(
      response =>{
        this.respuesta = response;
        this.centroTrabajadores = this.respuesta.centroTrabajadores;
      },
      error => {
        console.log(error);
      }
    )
  }
}
