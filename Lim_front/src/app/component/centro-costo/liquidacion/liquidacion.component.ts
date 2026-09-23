import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRoute } from "@angular/router";
//MODELOS
import { Liquidacion } from "../../../model/liquidacion";
//SERVICIOS
import { LiquidacionService } from "../../../services/liquidacion/liquidacion.service";
import { TrabajadorService } from "../../../services/trabajador/trabajador.service";

import { FormBuilder, FormGroup } from '@angular/forms';

import { AlertasService } from "src/app/services/alertas/alertas.service";

@Component({
  selector: "app-liquidacion",
  templateUrl: "./liquidacion.component.html",
  styleUrls: ["./liquidacion.component.css"],
})
export class LiquidacionComponent implements OnInit {

  public idTrabajador;
  public trabajador;
  public liquidacion: Liquidacion;
  public tipoTrabajador: boolean = true;
  public form: FormGroup;
  constructor(
    private liquidacionService: LiquidacionService,private trabajadorService: TrabajadorService,
    private route: Router, private _route: ActivatedRoute,
    private alertaService:AlertasService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.liquidacion = new Liquidacion(
      1,301000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,null,0,0,0,0,true,null
    );
    // Aseguramos que la propiedad exista antes de que el HTML intente leerla
    if (this.liquidacion) {
      this.liquidacion.reajuste_retroactivo = 0;
      
    }

    this.obtenerId();
    
    this.form = this.fb.group({
      indemnizacion_activo: [false],
      dias_feriados_activo: [false]
    });
    // reset automáticos
    this.form.get('indemnizacion_activo').valueChanges.subscribe(activo => {
      if (!activo) {
        this.liquidacion.monto_indemnizacion = 0;
        this.liquidacion.bono_indemnizacion = 0;
      }
    });

    this.form.get('dias_feriados_activo').valueChanges.subscribe(activo => {
      if (!activo) {
        this.liquidacion.horas_feriado = 0;
        this.liquidacion.valor_hora_feriado = 0;
      }
    });
    //sin ocultar
    console.log(this.liquidacion.reajuste_retroactivo)
  }
  
  // ocultar feriados  e indemnizacion
  // mostrarIndemnizacion() {
  //   const activo = this.form.get('indemnizacion_activo').value;
  //   if (!activo) { // si se desactiva, pongo en cero
  //     this.liquidacion.monto_indemnizacion = 0;
  //     this.liquidacion.bono_indemnizacion = 0;
  //   }
  //   return activo;
  // }

  // mostrarFeriados() {
  //   const activo = this.form.get('dias_feriados_activo').value;
  //   if (!activo) { // si se desactiva, pongo en cero
  //     this.liquidacion.horas_feriado = 0;
  //     this.liquidacion.valor_hora_feriado = 0;
  //   }
  //   return activo;
  // }
  //Fin ocultar feriados  e indemnizacion
  //OBTENER ID
  // Crea este pequeño método al principio de tus funciones de cálculo
  private safeNum(val: any): number {
    return (val === undefined || val === null || isNaN(Number(val))) ? 0 : Number(val);
  }

  obtenerId() {
    this.idTrabajador = this._route.snapshot.paramMap.get("idTrabajador");
    this.obtenerTrabajador();
  }
  //OBTENER TRABAJADOR CON SUS AFP,SEGURO, SALUD
  obtenerTrabajador() {
    this.alertaService.loading()
    this.trabajadorService.obtenerTrabajadorId(this.idTrabajador).subscribe(
      (response:any) => {
        this.alertaService.cerrarAlerta()
        this.trabajador = response.trabajador;
        this.liquidacion.sueldo_base = this.trabajador.dato_liquidacione.sueldo_base;
        this.liquidacion.porcentaje_gratificacion = this.trabajador.dato_liquidacione.gratificacion;
        this.liquidacion.reajuste_retroactivo = this.trabajador.dato_liquidacione.reajuste_retroactivo || 0;
        this.liquidacion.monto_responsabilidad = this.trabajador.dato_liquidacione.responsabilidad;
        this.liquidacion.colacion = this.trabajador.dato_liquidacione.colacion;
        this.liquidacion.movilizacion = this.trabajador.dato_liquidacione.movilizacion;
        this.liquidacion.alimentacion = this.trabajador.dato_liquidacione.alimentacion;
        this.liquidacion.cant_familiar = this.trabajador.dato_liquidacione.cant_familia;
        this.liquidacion.valor_carga_familiar = this.trabajador.dato_liquidacione.valor_carga_familia;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //CAMBIAR EL TIPO DE TRABAJADOR
  cambiarTipoTrabajador() {
    this.tipoTrabajador = !this.tipoTrabajador;
    this.calcularMontoMes();
  }
  /** FUNCIONES PARA CALCULAR DATOS DE LIQUIDACION */

  //Calcular monto mes y gratificacion
  calcularMontoMes() {
    if (
      this.liquidacion.sueldo_base >= 0 &&
      this.liquidacion.dias_trabajados >= 0
    ) {
      if (this.tipoTrabajador) {
        this.liquidacion.monto_mes = Math.round(
          (this.liquidacion.sueldo_base * this.liquidacion.dias_trabajados) / 30
        );
      } else {
        this.liquidacion.monto_mes = Math.round(
          this.liquidacion.sueldo_base * this.liquidacion.dias_trabajados
        );
      }
      console.log("retoractivo")
      console.log(this.liquidacion.reajuste_retroactivo)
      this.calcularGratificacion();
      this.calcularValorHoraExtra();
      this.calcularBonoIndemnizacion();
      this.calcularBonoProduccion();
      this.calcularBonoResponsabilidad();
      this.calcularValorMovilizacion();
      this.calcularTotalImponible();
    }
  }
  //Calcular gratificacion
  calcularGratificacion() {
    this.liquidacion.gratificacion = Math.round(
      this.liquidacion.monto_mes *
        (this.liquidacion.porcentaje_gratificacion / 100)
    );
  }

  //Calcular valor hora extra
  calcularValorHoraExtra() {
    if (this.liquidacion.cant_horas_extras >= 0) {
      this.liquidacion.valor_horas_extras = Math.round(
        this.liquidacion.sueldo_base *
          0.0077777 *
          this.liquidacion.cant_horas_extras
      );
      this.calcularTotalImponible();
    }
  }
  //Calcular bono produccion
  calcularBonoProduccion() {
    if (this.liquidacion.monto_produccion >= 0) {
      this.liquidacion.bono_produccion = Math.round(
        (this.liquidacion.monto_produccion / 30) *
          this.liquidacion.dias_trabajados
      );
      this.calcularTotalImponible();
    }
  }
  //Calcular bono indemnizacion
  calcularBonoIndemnizacion() {
    if (this.liquidacion.monto_indemnizacion >= 0) {
      this.liquidacion.bono_indemnizacion = Math.round(
        (this.liquidacion.monto_indemnizacion / 30) *
          this.liquidacion.dias_trabajados
      );
      this.calcularTotalHaber();
    }
  }
  //Calcular bono responsabilidad
  calcularBonoResponsabilidad() {
    if (this.liquidacion.monto_responsabilidad >= 0) {
      this.liquidacion.bono_responsabilidad = Math.round(
        (this.liquidacion.monto_responsabilidad / 30) *
          this.liquidacion.dias_trabajados
      );
      this.calcularTotalImponible();
    }
  }
  //Calcular valor hora feriado
  calcularValorHoraFeriado() {
    if (this.liquidacion.horas_feriado >= 0) {
      this.liquidacion.valor_hora_feriado = Math.round(
        (this.liquidacion.sueldo_base +
          this.liquidacion.sueldo_base * 0.05 +
          this.liquidacion.bono_produccion +
          this.liquidacion.bono_responsabilidad +
          this.liquidacion.bono_indemnizacion) /
          30 /
          (7.5 * this.liquidacion.horas_feriado)
      );
      this.calcularTotalImponible();
    }
  }
  //Calcular Total Imponible
  calcularTotalImponible() {
    // Creamos una función interna rápida para limpiar los valores
  // if(this.liquidacion.reajuste_retroactivo == undefined){
  //   console.log("es undefine")
  //   console.trace();
  //   this.liquidacion.reajuste_retroactivo = 0
  // }
  console.log("desde calcular total imponible")
  console.log(this.liquidacion.reajuste_retroactivo)
    this.liquidacion.total_imponible = Math.round(
      (Number(this.liquidacion.monto_mes) || 0) +
      (Number(this.liquidacion.valor_horas_extras) || 0) +
      (Number(this.liquidacion.gratificacion) || 0) +
      (Number(this.liquidacion.reajuste_retroactivo) || 0) + // <--- Esto evita el NaN
      (Number(this.liquidacion.bono_produccion) || 0) +
      (Number(this.liquidacion.bono_responsabilidad) || 0) +
      (Number(this.liquidacion.valor_hora_feriado) || 0)
    );

    //anTES DEL CALCULO RESPALDO:
    // this.liquidacion.monto_mes +
    //     this.liquidacion.gratificacion +
    //     Number(this.liquidacion.reajuste_retroactivo || 0) +
    //     this.liquidacion.valor_horas_extras +
    //     this.liquidacion.valor_hora_feriado +
    //     this.liquidacion.bono_produccion +
    //     this.liquidacion.bono_responsabilidad +
    //     this.liquidacion.reajuste_retroactivo

    

    this.calcularTotalHaber();
    this.calcularSeguroAfpSalud();
  }
  //Calcular valor movilizacion
  calcularValorMovilizacion() {
    if (this.liquidacion.movilizacion >= 0) {
      this.liquidacion.valor_movilizacion = Math.round(
        (this.liquidacion.movilizacion / 30) * this.liquidacion.dias_trabajados
      );
      this.calcularTotalHaber();
    }
  }
  //Calcular total haber
  calcularTotalHaber() {
    this.liquidacion.total_haber = Math.round(
      this.liquidacion.total_imponible +
        this.liquidacion.colacion +
        this.liquidacion.valor_movilizacion +
        this.liquidacion.valor_carga_familiar +
        this.liquidacion.bono_indemnizacion +
        this.liquidacion.reajuste_retroactivo
    );
    this.calcularValorHoraFaltante();
    this.calcularTotalPago();
  }
  //Calcular valor hora faltante
  calcularValorHoraFaltante() {
    this.liquidacion.valor_hora_faltante = Math.round(
      (this.liquidacion.total_haber / 30 / 8) * this.liquidacion.hora_faltante
    );

    this.calcularTotalDescuento();
  }

  //Calcular seguro,salud, afp
  calcularSeguroAfpSalud() {
    this.liquidacion.cotizacion_obligatoria = Math.round(
      this.liquidacion.total_imponible *
        (this.trabajador.instituto_previsione.comision / 100)
    );
    this.liquidacion.seguro_cesantia = Math.round(
      this.liquidacion.total_imponible * (this.trabajador.seguro.comision / 100)
    );
    this.liquidacion.salud = Math.round(
      this.liquidacion.total_imponible * (this.trabajador.salude.comision / 100)
    );

    this.calcularTotalDescuento();
  }

  //Calcular total descuento
  calcularTotalDescuento() {
    this.liquidacion.total_descuento = Math.round(
      this.liquidacion.cotizacion_obligatoria +
        this.liquidacion.seguro_cesantia +
        this.liquidacion.salud +
        this.liquidacion.valor_hora_faltante
    );

    this.calcularTotalPago();
  }

  //calcular total a pagar
  calcularTotalPago() {
    this.liquidacion.total_pago = Math.round(
      this.liquidacion.total_haber - this.liquidacion.total_descuento
    );

    this.calcularLiquidoPagar();
  }

  //Calcular liquido a pagar
  calcularLiquidoPagar() {
    this.liquidacion.liquido_pagar = Math.round(
      this.liquidacion.total_pago -
        this.liquidacion.anticipo -
        this.liquidacion.alimentacion
    );
  }

  ////******* FIN FUNCIONES  ******//////

  //CREAR LIQUIDACION
  crearLiquidacion(valid) {
    if (valid) {
      this.alertaService.loading()
      this.liquidacion.estado = 1;
      this.liquidacion.tipo_trabajador = this.tipoTrabajador;
      this.liquidacionService.crearLiquidacion(this.liquidacion,this._route.snapshot.paramMap.get("idCentroTrabajador")).subscribe(
        (response:any) => {
          this.alertaService.cerrarAlerta()
          if (response.liquidacion) {
            this.alertaService.showNotification('Liquidación Creada Correctamente!')
          }
          this.volver();
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //REGRESAR AL CENTRO DE COSTOS CON ID
  volver() {
    this.route.navigate(["/ver/",this._route.snapshot.paramMap.get("idCentro")]);
  }
}
