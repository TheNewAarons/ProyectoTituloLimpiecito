import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CentroCostoService } from 'src/app/services/centro_costo/centro-costo.service';

import * as html2pdf from 'html2pdf.js';
@Component({
  selector: 'app-nueva-lista-pdf',
  templateUrl: './nueva-lista-pdf.component.html',
  styleUrls: ['./nueva-lista-pdf.component.css']
})
export class NuevaListaPdfComponent implements OnInit {

  public centro:any;
  public listaInsumos;
  public idCentro:any;
  public listaInsumo;

  constructor(
    private centroCostoService: CentroCostoService,private route:Router,
    private _route:ActivatedRoute, private alertaService:AlertasService
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
    this.alertaService.loading()
    this.centroCostoService.obtenerCentroId(this.idCentro).subscribe(
      (response:any) =>{
        this.alertaService.cerrarAlerta()
        this.centro = response.centro;
        this.listaInsumos = this.centro.lista_insumos;
        this.buscarLista();
      },
      error => {
        this.alertaService.cerrarAlerta()
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
      filename:`Lista_insumo_${this.centro.cliente.representante}.pdf`,
      argin: [10,10,10,10],
      html2canvas: {},
      jsPDF: { orientation:'landscape',format:'legal'}
    }
    const content: Element = document.getElementById('imprimir');
    html2pdf()
      .from(content)
      .set(options)
      .save();
  }

}
