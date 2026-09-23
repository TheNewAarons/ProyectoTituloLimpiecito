import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import * as html2pdf from 'html2pdf.js';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

//SERVICIOS
import { LiquidacionService } from '../../../services/liquidacion/liquidacion.service';

@Component({
  selector: 'app-ver-liquidacion',
  templateUrl: './ver-liquidacion.component.html',
  styleUrls: ['./ver-liquidacion.component.css']
})
export class VerLiquidacionComponent implements OnInit {

  public liquidacion;
  public respuesta;
  public trabajador;
  public centro_costo;
  public centroTrabajador;
  public idLiquidacion;
  
  constructor(
    private liquidacionService:LiquidacionService,private router:Router,
    private route:ActivatedRoute, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID 
  obtenerId(){
    this.idLiquidacion = this.route.snapshot.paramMap.get('id');
    this.obtenerLiquidacionId();
  }
  //OBTENER LIQUIDACION POR ID
  obtenerLiquidacionId(){
    this.alertaService.loading()
    this.liquidacionService.obtenerLiquidacionId(this.idLiquidacion).subscribe(
      (response:any) => {
        this.alertaService.cerrarAlerta()
        this.centroTrabajador = response.centroTrabajador;
        this.trabajador = this.centroTrabajador.trabajadore;
        this.liquidacion = this.centroTrabajador.liquidacione;
        this.centro_costo = this.centroTrabajador.centro_costo;
      },
      error => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    )
  }
  //REGRESAR AL CENTRO DE COSTOS CON ID
  volver(){
    this.router.navigate(['/ver/',this.centro_costo.id]);
  }
  //CERRAR LIQUIDACION
  cerrarLiquidacion(){
    this.alertaService.loading()
    this.liquidacionService.cerrarLiquidacion(this.liquidacion.id).subscribe(
      (response:any) => {
        this.alertaService.cerrarAlerta()
        if(response.filas != 0){
          this.volver();
        }
      },
      error =>{
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    )
  }
  //METODO PARA IMPRIMIR O EXPORTAR PDF
  // imprimir() {
  // const content: HTMLElement = document.getElementById('imprimir');

  // // Clonar el contenido y aplicarle un "zoom" CSS
  // const clone = content.cloneNode(true) as HTMLElement;
  // clone.style.transform = "scale(0.5)";   // 🔹 Ajusta aquí (0.8, 0.75, etc.)
  // clone.style.transformOrigin = "top center";
  // clone.style.width = "800px";            // 🔹 Fuerza un ancho más chico

  // // Crear contenedor temporal
  // const wrapper = document.createElement('div');
  // wrapper.appendChild(clone);
  // document.body.appendChild(wrapper);

  // const options = {
  //   filename: 'Liquidacion.pdf',
  //   image: { type: 'jpeg', quality: 1 }, // máxima calidad
  //   html2canvas: { scale: 2 },           // 🔹 mayor resolución
  //   jsPDF: { orientation: 'portrait', unit: 'pt', format: 'letter' },
  //   margin: 0
  // };

  // html2pdf().from(clone).set(options).save().then(() => {
  //   wrapper.remove(); // limpiar el DOM
  // });
  // }

imprimir() {
  const content: HTMLElement = document.getElementById('imprimir');
  const clone = content.cloneNode(true) as HTMLElement;
  
  // Mantenemos tus ajustes de escala que ya te gustan
  clone.style.transform = "scale(0.5)";   
  clone.style.transformOrigin = "top center";
  clone.style.width = "800px";            
  clone.style.margin = "0"; 
  clone.style.padding = "0";

  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.left = '-9999px';
  wrapper.style.overflow = 'hidden';
  
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const options = {
    filename: 'Liquidacion.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      logging: false,
      scrollY: 0,
      useCORS: true
    },
    jsPDF: { orientation: 'portrait', unit: 'pt', format: 'letter' },
    margin: 30, // Forzamos margen 0 en el PDF
    pagebreak: { mode: 'avoid-all' } 
  };

  // Usamos el objeto worker de html2pdf para tener más control
  const worker = html2pdf().set(options).from(clone).toPdf().get('pdf').then((pdf) => {
    // ESTA ES LA CLAVE: Si hay más de una página, borramos las sobrantes
    const totalPages = pdf.internal.getNumberOfPages();
    if (totalPages > 1) {
      for (let i = totalPages; i > 1; i--) {
        pdf.deletePage(i);
      }
    }
  }).save().then(() => {
    document.body.removeChild(wrapper);
  });
}

}
