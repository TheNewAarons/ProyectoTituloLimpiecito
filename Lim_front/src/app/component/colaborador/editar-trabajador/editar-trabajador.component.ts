import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { ActivatedRoute } from '@angular/router';

//SERVICIOS 
import { TrabajadorService } from './../../../services/trabajador/trabajador.service';
import { DescuentoService } from './../../../services/descuento/descuento.service';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-editar-trabajador',
  templateUrl: './editar-trabajador.component.html',
  styleUrls: ['./editar-trabajador.component.css']
})
export class EditarTrabajadorComponent implements OnInit {

  public respuesta;
  public trabajador;
  public idTrabajador

  public afps;
  public saludes;
  public seguros;
  public listo = false;
  
  constructor(
    private trabajadorService: TrabajadorService, private descuentoService:DescuentoService,
    private route:Router, private _route:ActivatedRoute,
    private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerSeguros();
    this.obtenerSaludes();
    this.obtenerAfps();
    this.obtenerId();
  }
  //OBTENER ID 
  obtenerId(){
    this.idTrabajador = this._route.snapshot.paramMap.get('id');
    this.obtenerTrabajador();
  }
  //OBTENER TRABAJADOR CON SUS AFP,SEGURO, SALUD
  obtenerTrabajador(){
    this.trabajadorService.obtenerTrabajadorId(this.idTrabajador).subscribe(
      response => {
        this.respuesta = response;
        this.trabajador = this.respuesta.trabajador;
        this.listo = true;
      },
      error => {
        console.log(error);
      }
    )
  }
  // //OBTENER AFP
  obtenerAfps(){
    this.descuentoService.obtenerActivosAfp().subscribe(
      response => {
        this.respuesta = response;
        this.afps = this.respuesta.afps;
      },
      error => {
        console.log(error);
      }
    )
  }
  //OBTENER SALUD
  obtenerSaludes(){
    this.descuentoService.obtenerSaludActivos().subscribe(
      response => {
        this.respuesta = response;
        this.saludes = this.respuesta.saludes;
      },
      error => {
        console.log(error);
      }
    )
  }
  //OBTENER SEGURO
  obtenerSeguros(){
    this.descuentoService.obtenerSeguroActivos().subscribe(
      response => {
        this.respuesta = response;
        this.seguros = this.respuesta.seguros;
      },
      error => {
        console.log(error);
      }
    )
  }
   //EDITAR TRABAJADOR
  editarTrabajador(valid){
    if(valid){
      this.trabajador.dato_liquidacione.sueldo_base = this.trabajador.dato_liquidacione.sueldo_base.replace(/,/g,''); 
      this.trabajador.dato_liquidacione.responsabilidad = this.trabajador.dato_liquidacione.responsabilidad.replace(/,/g,'');
      this.trabajador.dato_liquidacione.colacion = this.trabajador.dato_liquidacione.colacion.replace(/,/g,'');
      this.trabajador.dato_liquidacione.movilizacion = this.trabajador.dato_liquidacione.movilizacion.replace(/,/g,'');
      this.trabajador.dato_liquidacione.alimentacion = this.trabajador.dato_liquidacione.alimentacion.replace(/,/g,'');
      this.trabajador.dato_liquidacione.cant_familia = this.trabajador.dato_liquidacione.cant_familia.replace(/,/g,'');
      this.trabajador.dato_liquidacione.valor_carga_familia = this.trabajador.dato_liquidacione.valor_carga_familia.replace(/,/g,'');
      
      /** para el trabajador */
      // this.trabajador.rut = this.trabajador.rut.replace(/\./g,'');
      // this.trabajador.rut = this.trabajador.rut.replace(/-/g,'');

      this.trabajadorService.editarTrabajador(this.trabajador,this.trabajador.id).subscribe(
        response => {
          this.respuesta = response;
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Trabajador Editado Correctamente')
            this.volver();
          }
        },
        error => {
          console.log(error);
        }
      )
    }
  }
   //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
   cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  }
  //REGRESAR A VER LIQUIDACION CON ID
  volver(){
    this.route.navigate(['/colaborador/trabajador']);
  }
 
}
