import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CarpetaService } from 'src/app/services/carpeta/carpeta.service';
import { formatDate } from '@angular/common';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

declare const $: any;

interface HtmlInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

@Component({
  selector: 'app-crear-documento',
  templateUrl: './crear-documento.component.html',
  styleUrls: ['./crear-documento.component.css']
})
export class CrearDocumentoComponent implements OnInit {

  id_cliente
  id_hijo
  documentoForm
  listaForm = []
  lista_files = []
  fd = new FormData()
  archivos_cargados = []
  ruta = null
  nombre_cliente: string;
  nombre_carpeta: string;
  id_carpeta_padre: string;
  id_padre_hijo: string;
  ruta_para_enviar = ''

  constructor(
    private route:ActivatedRoute,private carpetaService:CarpetaService,
    private fb:FormBuilder, private location:Location,
    private alertaService:AlertasService,private router:Router
  ) { }

  get documentos(){
    return this.documentoForm.get('documentos') as FormArray
  }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.id_hijo = this.route.snapshot.paramMap.get('id_hijo')
    this.ruta = this.route.snapshot.paramMap.get('ruta')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre_cliente')
    this.nombre_carpeta = this.route.snapshot.paramMap.get('nombre_carpeta')
    this.id_carpeta_padre = this.route.snapshot.paramMap.get('id_carpeta_padre')
    this.id_padre_hijo = this.route.snapshot.paramMap.get('id_padre_hijo')
    console.log(this.ruta)
    this.generarRutaEnviado()
    this.buildForm()
    console.log('ruta',this.ruta_para_enviar)
  }
  buildForm(){
    this.documentoForm = this.fb.group({
      documentos: this.fb.array([])
    })
  }
  volver(){
    this.router.navigate(['/carpeta/carpeta_hijo',this.id_cliente,this.id_carpeta_padre,this.id_padre_hijo,this.id_hijo,this.nombre_cliente,this.nombre_carpeta,this.ruta])
    // this.location.back()
  }
  agregarDocumento(){
    const documentosFormGroup = this.fb.group({
      fileSource:[null],
      nombre:[null,Validators.required],
      url:null,
      file:[null,Validators.required],
      fecha:formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US'),
      carpetaId:this.id_hijo,
    })
    this.documentos.push(documentosFormGroup)
  }
  removerDocumento(indice){
    this.documentos.removeAt(indice)
    this.archivos_cargados.splice(indice,1)
  }

  pdfSelecionado(event: HtmlInputEvent,indice) {
    if (event.target.files && event.target.files[0]) {
      let file:File = event.target.files[0]; 
      if (file.type != 'application/pdf' && file.type != 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && file.type != 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        file = null
        let campo_file = $(`#documento_file_${indice}`)
        campo_file.wrap('<form>').closest('form').get(0).reset()
        this.documentos.value[indice].file = file
        this.archivos_cargados[indice] = null 
        this.alertaService.alertaErrorMsj('Suba un archivo de tipo PDF - WORD - EXCEL')
      }else{
        this.documentos.value[indice].fileSource = file
        this.archivos_cargados[indice] = file
      }
    }
  }
  generarRutaEnviado(){
    JSON.parse(this.ruta).forEach(element => {
      this.ruta_para_enviar = this.ruta_para_enviar+'-'+element.nombre_carpeta
    });
  }

  crearDocumentos(){
    if(this.comprobarCampos()){
      this.crearFormData()
        this.alertaService.loading()
        this.carpetaService.crearDocumentos(this.fd,this.id_cliente,this.ruta_para_enviar).subscribe(
          (response:any)=>{
            this.alertaService.cerrarAlerta()
            if(this.documentos.value.length === response.cantidad){
              this.alertaService.showNotification('Documentos Creados Correctamente')
              this.location.back()
            }
          },
          error => {
            this.alertaService.cerrarAlerta()
            this.alertaService.alertaError()
          }
        )
    }else{
      this.alertaService.alertaErrorMsj('Rellenar todos los campos requeridos')
    }
  }

  //CREAR ARRAY DE FORMDATA
  crearFormData(){
    this.archivos_cargados.forEach(e => {
      this.fd.append('pdf',e);
    });
    this.fd.append('documentos',JSON.stringify(this.documentos.value))
  }

  //COMPROBAR SI HAY CAMPOS NULL
  comprobarCampos(){
    let campo_null = 0
    if(this.documentos.value.length != this.archivos_cargados.length){
      return false
    }else{
      this.archivos_cargados.forEach(e => {
        if(e === null){
          campo_null++
        }
      })
      if(campo_null === 0){
        return true;
      }else{
        return false
      }
    }
  }

}
