import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';

@Component({
  selector: 'app-crear-sub-carpeta',
  templateUrl: './crear-sub-carpeta.component.html',
  styleUrls: ['./crear-sub-carpeta.component.css']
})
export class CrearSubCarpetaComponent implements OnInit {

  id_carpeta_padre
  id_padre_hijo
  id_hijo
  carpetaForm
  id_cliente: string;
  ruta: string;
  nombre_cliente: string;
  nombre_carpeta: string;

  constructor(
    private route:ActivatedRoute,private carpetaService:CarpetaService,
    private fb:FormBuilder, private location:Location,
    private alertaService:AlertasService, private router:Router
    ) { }

  get carpetas(){
    return this.carpetaForm.get('carpetas') as FormArray
  }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.ruta = this.route.snapshot.paramMap.get('ruta')
    this.id_carpeta_padre = this.route.snapshot.paramMap.get('id_carpeta_padre')
    this.id_padre_hijo = this.route.snapshot.paramMap.get('id_padre_hijo')
    this.id_hijo = this.route.snapshot.paramMap.get('id_hijo')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre_cliente')
    this.nombre_carpeta = this.route.snapshot.paramMap.get('nombre_carpeta')
    this.buildForm()
  }
  buildForm(){
    this.carpetaForm = this.fb.group({
      carpetas: this.fb.array([]) 
    })
  }

  volver(){
    this.router.navigate(['/carpeta/carpeta_hijo',this.id_cliente,this.id_carpeta_padre,this.id_padre_hijo,this.id_hijo,this.nombre_cliente,this.nombre_carpeta,this.ruta])
    // this.location.back()
  }

  agregarCarpeta(){
    const carpetasFormGroup = this.fb.group({
      nombre:'',
      padreId:null,
      carpetaPadreId:this.id_hijo
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
          this.location.back()
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
