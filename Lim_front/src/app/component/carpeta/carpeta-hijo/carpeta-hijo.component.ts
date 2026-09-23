import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';
import { saveAs } from 'file-saver';
import swal from 'sweetalert2';

export class Ruta{
  constructor(
    public nombre_carpeta:string,
    public id_padre:number,
    public id_hijo:number
  ){}
}

@Component({
  selector: 'app-carpeta-hijo',
  templateUrl: './carpeta-hijo.component.html',
  styleUrls: ['./carpeta-hijo.component.css']
})
export class CarpetaHijoComponent implements OnInit {

  id_cliente
  id_carpeta_padre
  id_padre_hijo
  id_hijo
  carpetas_existe = []
  carpetas = []
  documentos = []
  documentos_existe = []
  page = 1
  pageSize = 20
  busca = null
  nombre_cliente
  nombre_carpeta
  ruta = null
  rutas:Ruta[] = []
  ruta_string = null
  ruta_url = null

  constructor(private route:ActivatedRoute, private carpetaService:CarpetaService,
    private router:Router, private alertaService:AlertasService) { }

  ngOnInit() {
    console.log('1 vez')
    this.route.paramMap.subscribe(params=>{
      this.ruta = new Ruta('',null,null)
      this.id_cliente = params.get('id_cliente')
      this.id_carpeta_padre = params.get('id_carpeta_padre')
      this.id_padre_hijo = params.get('id_padre_hijo')
      this.id_hijo = params.get('id_hijo')
      this.nombre_cliente = params.get('nombre_cliente')
      this.obtenerCarpetas(this.id_hijo)
      this.ruta_url = params.get('ruta')
      if(this.ruta_url){
        this.rutas = []
        this.nombre_carpeta = params.get('nombre_carpeta')
        this.ruta.id_padre = this.id_padre_hijo
        this.ruta.id_hijo = this.id_hijo
        this.ruta.nombre_carpeta = this.nombre_carpeta
        this.rutas = JSON.parse(this.ruta_url)
        this.generarRuta(this.ruta)
      }else{
        this.nombre_carpeta = params.get('nombre_carpeta')
        this.ruta.id_padre = this.id_padre_hijo
        this.ruta.id_hijo = this.id_hijo
        this.ruta.nombre_carpeta = this.nombre_carpeta
        this.generarRuta(this.ruta)
      }
    })
  }
  //OBTENER CARPETAS
  obtenerCarpetas(id){
    this.alertaService.loading()
    this.carpetaService.obtenerSubCarpetasHijo(id).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.carpetas = response.carpetas
        this.carpetas_existe = response.carpetas
        this.documentos_existe = response.documentos
        this.documentos = response.documentos
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )
  }
  generarRuta(ruta){
    let objeto_buscar = this.rutas.find(x => x.nombre_carpeta === ruta.nombre_carpeta)
    // console.log(objeto_buscar)
    let index2 = this.rutas.indexOf(objeto_buscar)
    // console.log(index2)
    if(index2 === -1){
      this.rutas.push(ruta)
    }
    // console.log('despues de generar',this.rutas)
    this.ruta_string = JSON.stringify(this.rutas)
  }
  comprobarVuelta(){
    if(this.id_padre_hijo === this.id_hijo){
      return true
    }else{
      return false
    }
  }
  volver(){
    // console.log(this.rutas.length)
    if(this.rutas.length === 1){
      this.ruta_string = JSON.stringify(this.rutas)
      this.router.navigate(['/carpeta/carpeta_hijo',this.id_cliente,this.id_carpeta_padre,this.rutas[0].id_padre,this.rutas[0].id_hijo,this.nombre_cliente,this.rutas[0].nombre_carpeta,this.ruta_string])
    }else{
      this.rutas.pop()
      this.ruta_string = JSON.stringify(this.rutas)
      this.router.navigate(['/carpeta/carpeta_hijo',this.id_cliente,this.id_carpeta_padre,this.rutas[this.rutas.length-1].id_padre,this.rutas[this.rutas.length-1].id_hijo,this.nombre_cliente,this.rutas[this.rutas.length-1].nombre_carpeta,this.ruta_string])
    }
  }
  cambiarCarpeta(id_carpeta,nombre){
    // console.log('al cambiar',this.rutas)
    this.router.navigate(['/carpeta/carpeta_hijo/',this.id_cliente,this.id_carpeta_padre,this.id_hijo,id_carpeta,this.nombre_cliente,nombre,this.ruta_string])
    this.obtenerCarpetas(id_carpeta)
  }

  buscarDocumentos(){
    this.alertaService.loading()
    this.carpetaService.busquedaDocumentos(this.id_hijo,this.busca).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.documentos = response.documentos
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
      }
    )
  }

  //ELIMINAR DOCUMENTO
  eliminarDocumento(id_documento,nombre_archivo){
    swal.fire({
      title: '¿Estas seguro?',
      text: '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Borrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if(result.value){
        this.alertaService.loading()
        this.carpetaService.eliminarInstanciaDocumento(this.id_hijo,id_documento,nombre_archivo,this.id_cliente).subscribe(
          (response:any)=>{
            this.alertaService.cerrarAlerta()
            this.alertaService.alertaExitoMsj('Se Elimino el Documento')
            this.documentos = response.documentos 
            if(response.documentos.length === 0){
              this.documentos_existe = response.documentos
            }
          },
          error => {
            this.alertaService.cerrarAlerta()
            this.alertaService.alertaError()
            console.log(error)
          }
        )
      }
    })
  }
  //DESCARGAR ARCHIVO
  descargarArchivo(url,nombre){
    this.carpetaService.descargarArchivo(url).subscribe(
      (response:any)=>{
        saveAs(response, nombre);
      },
      error => {
        console.log(error)
      }
    )
  }
  //ELIMINAR CARPETA
  eliminarCarpeta(id_carpeta){
    this.alertaService.loading()
    this.carpetaService.eliminarCarpetaHijo(id_carpeta,this.id_hijo).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        if(response.borrar){
          this.alertaService.alertaExitoMsj(response.mensaje)
          this.carpetas = response.carpetas
          if(response.carpetas.length === 0){
            this.carpetas_existe = response.carpetas
          }
        }else{
          this.alertaService.alertaErrorMsj(response.mensaje)
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
        console.log(error)
      }
    )
  }


}
