import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import * as html2pdf from 'html2pdf.js';

//SERVICIOS 
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';


@Component({
  selector: 'app-pdf-centro',
  templateUrl: './pdf-centro.component.html',
  styleUrls: ['./pdf-centro.component.css']
})
export class PdfCentroComponent implements OnInit {

  public respuesta;
  public centro:any;
  public trabajadores;
  public listaInsumos;
  public lineaInsumos; //No se ocupa por ahora
  public egresos;
  public ingresos;
  public idCentro:any;

  public utilidadMoment = 0;
  public total_costosMoment = 0;
  //PARA MOSTRAR 
  public totalLista = 0;
  public totalLiquidacion = 0;
  public totalEgresos = 0;

  constructor(
    private centroCostoService: CentroCostoService, private route:Router,
    private _route:ActivatedRoute
  ) { }

  ngOnInit() {
    this.obtenerId();
  }
  //OBTENER ID DE CENTRO COSTO DE LA RUTA
  obtenerId(){
    this.idCentro = this._route.snapshot.paramMap.get('id');
    this.obtenerDatosCentroCosto();
  }

  //OBTENER INFORMACION DEL CENTRO DE COSTO
  obtenerDatosCentroCosto(){
    this.centroCostoService.obtenerCentroId(this.idCentro).subscribe(
      response =>{
        this.respuesta = response;
        this.centro = this.respuesta.centro;
        this.trabajadores = this.centro.centro_costo_trabajadores;
        this.listaInsumos = this.centro.lista_insumos;
        this.egresos = this.centro.cc_egresos;
        this.ingresos = this.centro.cc_ingresos;
        this.obtenerTotalFicticio();
        //console.log(this.centro);
      },
      error => {
        console.log(error);
      }
    )
  }
  //VOLVER A CENTROS DE COSTO CON SU ID 
  volver(){
    this.route.navigate(['/ver/',this.idCentro]);
  }
  //METODO PARA IMPRIMIR O EXPORTAR PDF
  imprimir(){
    const options = {
      filename:'Centro_Costo.pdf',
      margin: [10,10,10,10],
      html2canvas: {},
      jsPDF: { orientation:'portrait',format:'letter'}
    }
    const content: Element = document.getElementById('imprimir');
    html2pdf()
      .from(content)
      .set(options)
      .save();
  }
  //OBTENER DATOS FICTICIOS PARA EL CENTRO DE COSTO
  obtenerTotalFicticio(){
    this.totalLiquidacion = 0;
    this.trabajadores.forEach(element => {
      if(element.liquidacione){
        this.totalLiquidacion += element.liquidacione.liquido_pagar;
      }
    });
    this.totalLista = 0;
    this.listaInsumos.forEach(elemento => {
      if(elemento.estado == 1){
        this.totalLista += elemento.total;
      }
    });
    let totalEgresos = 0;
    this.egresos.forEach(elemen => {
      this.totalEgresos += elemen.monto;
    });
    this.total_costosMoment = this.totalLiquidacion+this.totalEgresos;
    this.utilidadMoment= this.centro.precio_servicio - this.total_costosMoment;
  }

}
