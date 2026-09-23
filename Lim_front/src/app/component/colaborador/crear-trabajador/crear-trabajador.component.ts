import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { ActivatedRoute } from '@angular/router';

//SERVICIOS 
import { TrabajadorService } from './../../../services/trabajador/trabajador.service';
import { DescuentoService } from './../../../services/descuento/descuento.service';

//MODELOS
import { Trabajador } from './../../../model/trabajador';
import { DatoLiquidacione } from './../../../model/dato_liquidacione';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-crear-trabajador',
  templateUrl: './crear-trabajador.component.html',
  styleUrls: ['./crear-trabajador.component.css']
})
export class CrearTrabajadorComponent implements OnInit {

  public trabajador: Trabajador;
  public respuesta;
  public afps;
  public saludes;
  public seguros;
  public dato_liquidacione:DatoLiquidacione;
  
  constructor(
    private trabajadorService:TrabajadorService, private descuentoService:DescuentoService,
    private route:Router, private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerSeguros();
    this.obtenerSaludes();
    this.obtenerAfps();
    this.trabajador = new Trabajador(1,"","",null,null,null,"","",null,null,1,null,null,null,"",null,null,null,null);
    this.dato_liquidacione = new DatoLiquidacione(1,"0",0,"0","0","0","0","0","0");
  }
  //REGRESAR A VER LIQUIDACION CON ID
  volver(){
    this.route.navigate(['/colaborador/trabajador']);
  }
   //CREAR TRABAJADOR
   crearTrabajador(valid){
    if(valid){
      /** para los datos de liquidación */
      this.dato_liquidacione.sueldo_base = this.dato_liquidacione.sueldo_base.replace(/,/g,''); 
      this.dato_liquidacione.responsabilidad = this.dato_liquidacione.responsabilidad.replace(/,/g,'');
      this.dato_liquidacione.colacion = this.dato_liquidacione.colacion.replace(/,/g,'');
      this.dato_liquidacione.movilizacion = this.dato_liquidacione.movilizacion.replace(/,/g,'');
      this.dato_liquidacione.alimentacion = this.dato_liquidacione.alimentacion.replace(/,/g,'');
      this.dato_liquidacione.cant_familia = this.dato_liquidacione.cant_familia.replace(/,/g,'');
      this.dato_liquidacione.valor_carga_familia = this.dato_liquidacione.valor_carga_familia.replace(/,/g,'');
      /** para el trabajador */
      // this.trabajador.rut = this.trabajador.rut.replace(/\./g,'');
      // this.trabajador.rut = this.trabajador.rut.replace(/-/g,'');
      this.trabajadorService.crearTrabajador(this.trabajador,this.dato_liquidacione).subscribe(
        response => {
          this.alertaService.alertaExitoMsj("Trabajador Creado Correctamente!")
          this.volver();
        },
        error => {
          console.log(error);
        }
      )
    }
  }
  //OBTENER AFP
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
  //OPCIONES PARA QUE FORMATEE VALOR NUMERICO EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  }
  

}
