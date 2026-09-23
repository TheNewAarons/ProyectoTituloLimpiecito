import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { formatDate } from '@angular/common';

import * as html2pdf from 'html2pdf.js';

//SERVICIOS
import { LiquidacionService } from '../../../services/liquidacion/liquidacion.service';

@Component({
  selector: 'app-pdf-liquidacion',
  templateUrl: './pdf-liquidacion.component.html',
  styleUrls: ['./pdf-liquidacion.component.css']
})
export class PdfLiquidacionComponent implements OnInit {

  public liquidacion;
  public respuesta;
  public trabajador;
  public centro_costo;
  public centroTrabajador;
  public idLiquidacion;

  constructor(
    private liquidacionService:LiquidacionService,private route:Router,
    private _route:ActivatedRoute) { }

  ngOnInit() {
    this.obtenerId();
  }

  //REGRESAR AL CENTRO DE COSTOS CON ID
  volver(){
    this.route.navigate(['/colaborador/liquidacion']);
  }
  //OBTENER ID 
  obtenerId(){
    this.idLiquidacion = this._route.snapshot.paramMap.get('id');
    this.obtenerLiquidacionId();
  }
  //OBTENER LIQUIDACION POR ID
  obtenerLiquidacionId(){
    this.liquidacionService.obtenerLiquidacionId(this.idLiquidacion).subscribe(
      response => {
        this.respuesta = response;
        this.centroTrabajador = this.respuesta.centroTrabajador;
        this.trabajador = this.centroTrabajador.trabajadore;
        this.liquidacion = this.centroTrabajador.liquidacione;
        this.centro_costo = this.centroTrabajador.centro_costo;
      },
      error => {
        console.log(error);
      }
    )
  }
  //METODO PARA IMPRIMIR O EXPORTAR PDF
  imprimir(){
    const options = {
      filename:'Liquidacion.pdf',
      html2canvas: {},
      jsPDF: { orientation:'portrait',format:'letter'}
    }
    const content: Element = document.getElementById('imprimir');
    html2pdf()
      .from(content)
      .set(options)
      .save();
  }

}
