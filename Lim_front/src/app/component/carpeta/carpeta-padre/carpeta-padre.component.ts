import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';

@Component({
  selector: 'app-carpeta-padre',
  templateUrl: './carpeta-padre.component.html',
  styleUrls: ['./carpeta-padre.component.css']
})
export class CarpetaPadreComponent implements OnInit {

  id_cliente
  id_carpeta_padre
  carpetas = []
  nombre_cliente

  constructor(private route:ActivatedRoute, private carpetaService:CarpetaService,
    private alertaService:AlertasService) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.id_carpeta_padre = this.route.snapshot.paramMap.get('id_carpeta_padre')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre_cliente')
    if(this.id_carpeta_padre){
      this.obtenerCarpetasAsociadas()
    }
  }

  //OBTENER CARPETAS ASOCIADAS AL PADRE
  obtenerCarpetasAsociadas(){
    this.alertaService.loading()
    this.carpetaService.obtenerCarpetasDelPadre(this.id_carpeta_padre).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.carpetas = response.carpetas
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )
  }
  


}
