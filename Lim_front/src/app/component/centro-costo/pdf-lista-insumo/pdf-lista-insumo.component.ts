import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import * as html2pdf from 'html2pdf.js';

//SERVICIOS 
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';

@Component({
  selector: 'app-pdf-lista-insumo',
  templateUrl: './pdf-lista-insumo.component.html',
  styleUrls: ['./pdf-lista-insumo.component.css']
})
export class PdfListaInsumoComponent implements OnInit {

  public centro:any;
  public listaInsumos;
  public idCentro:any;
  public listaInsumo;

  constructor(
    private centroCostoService: CentroCostoService,private route:Router,
    private _route:ActivatedRoute
  ) { }

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID DE CENTRO COSTO DE LA RUTA
  obtenerId(){
    this.idCentro = this._route.snapshot.paramMap.get('id');
    //console.log(this.idCentro);
    this.obtenerDatosCentroCosto();
  }
  //OBTENER INFORMACION DEL CENTRO DE COSTO
  obtenerDatosCentroCosto(){
    this.centroCostoService.obtenerCentroId(this.idCentro).subscribe(
      (response:any) =>{
        this.centro = response.centro;
        this.listaInsumos = this.centro.lista_insumos;
        this.buscarLista();
        //console.log(this.centro);
      },
      error => {
        console.log(error);
      }
    )
  }
  //BUSCAR LA LISTA
  buscarLista(){
    this.listaInsumos.forEach(element => {
      if(element.id == this._route.snapshot.paramMap.get('id2')){
        this.listaInsumo = element;
      }
    });  
  }
  //VOLVER A CENTROS DE COSTOS 
  volver(){
    this.route.navigate(['/ver/',this.idCentro]);
  }
  //METODO PARA IMPRIMIR O EXPORTAR PDF
  imprimir(){
    const options = {
      filename:'Lista_insumo.pdf',
      argin: [10,10,10,10],
      html2canvas: {},
      jsPDF: { orientation:'portrait',format:'legal'}
    }
    const content: Element = document.getElementById('imprimir');
    html2pdf()
      .from(content)
      .set(options)
      .save();
  }

}
