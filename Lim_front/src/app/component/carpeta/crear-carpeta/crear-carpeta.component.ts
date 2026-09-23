import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';

@Component({
  selector: 'app-crear-carpeta',
  templateUrl: './crear-carpeta.component.html',
  styleUrls: ['./crear-carpeta.component.css']
})
export class CrearCarpetaComponent implements OnInit {

  id_cliente
  id_carpeta_padre
  carpetaForm
  nombre_cliente

  constructor(
    private route:ActivatedRoute,private carpetaService:CarpetaService,
    private fb:FormBuilder, private router:Router,
    private alertaService:AlertasService) { }

  get carpetas(){
    return this.carpetaForm.get('carpetas') as FormArray
  }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.id_carpeta_padre = this.route.snapshot.paramMap.get('id_carpeta_padre')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre_cliente')
    this.buildForm()
  }
  buildForm(){
    this.carpetaForm = this.fb.group({
      carpetas: this.fb.array([]) 
    })
  }

  agregarCarpeta(){
    const carpetasFormGroup = this.fb.group({
      nombre:'',
      padreId:this.id_carpeta_padre,
      carpetaPadreId:null
    })
    this.carpetas.push(carpetasFormGroup)
  }
  removerCarpeta(indice){
    this.carpetas.removeAt(indice)
  }

  crearCarpetas(){
    this.alertaService.loading()
    this.carpetaService.crearCarpetaHijos(this.carpetas.value).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        if(response.creados === this.carpetas.value.length){
          this.alertaService.showNotification('Carpetas Creadas Correctamente')
          this.router.navigate(['/carpeta/carpeta_padre',this.id_cliente,this.id_carpeta_padre,this.nombre_cliente])
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        alert('Ha ocurrido un error')
      }
    )
  }

}
