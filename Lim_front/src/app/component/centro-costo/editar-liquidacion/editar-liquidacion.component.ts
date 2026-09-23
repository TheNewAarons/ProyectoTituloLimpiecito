import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRoute } from "@angular/router";
//SERVICIOS
import { LiquidacionService } from "../../../services/liquidacion/liquidacion.service";
import { TrabajadorService } from "../../../services/trabajador/trabajador.service";

import { AlertasService } from "src/app/services/alertas/alertas.service";

@Component({
  selector: "app-editar-liquidacion",
  templateUrl: "./editar-liquidacion.component.html",
  styleUrls: ["./editar-liquidacion.component.css"],
})
export class EditarLiquidacionComponent implements OnInit {

  public liquidacion;
  public centroTrabajador;
  public idLiquidacion;
  public listo = false;
  public trabajador;

  constructor(
    private liquidacionService: LiquidacionService, private trabajadorService: TrabajadorService,
    private route: Router, private _route: ActivatedRoute,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID
  obtenerId() {
    this.idLiquidacion = this._route.snapshot.paramMap.get("idLiquidacion");
    this.obtenerLiquidacion();
  }

  //OBTENER LIQUIDACION
  obtenerLiquidacion() {
    this.liquidacionService.obtenerLiquidacionId(this.idLiquidacion).subscribe(
      (response:any) => {
        this.centroTrabajador = response.centroTrabajador;
        this.liquidacion = this.centroTrabajador.liquidacione;

        this.obtenerTrabajador();
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //OBTENER TRABAJADOR POR ID
  obtenerTrabajador() {
    this.trabajadorService.obtenerTrabajadorId(this._route.snapshot.paramMap.get("idTrabajador")).subscribe(
        (response:any) => {
          this.trabajador = response.trabajador;
          this.listo = true;
        },
        (error) => {
          console.log(error);
        }
      );
  }
  //REGRESAR A VER LIQUIDACION CON ID
  volver() {
    this.route.navigate([
      "/liquidacion/ver/",
      this._route.snapshot.paramMap.get("idLiquidacion"),
    ]);
  }

  //EDITAR LIQUIDACION
  editarLiquidacion(valid) {
    if (valid) {
      this.alertaService.loading()
      this.liquidacionService.editarLiquidacion(this.idLiquidacion, this.liquidacion).subscribe(
          (response:any) => {
            this.alertaService.cerrarAlerta()
            if (response.filas > 0) {
              this.alertaService.alertaExitoMsj("Liquidación Editada Correctamente!")
              this.volver();
            }
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
    }
  }

  /** FUNCIONES PARA CALCULAR DATOS DE LIQUIDACION */

  //Calcular monto mes y gratificacion
  calcularMontoMes() {
    if (
      this.liquidacion.sueldo_base >= 0 &&
      this.liquidacion.dias_trabajados >= 0
    ) {
      //IF momentaneo
      if (this.liquidacion.tipo_trabajador == null) {
        this.liquidacion.tipo_trabajador = true;
      }
      if (this.liquidacion.tipo_trabajador) {
        this.liquidacion.monto_mes = Math.round(
          (this.liquidacion.sueldo_base * this.liquidacion.dias_trabajados) / 30
        );
      } else {
        this.liquidacion.monto_mes = Math.round(
          this.liquidacion.sueldo_base * this.liquidacion.dias_trabajados
        );
      }
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
    this.liquidacion.total_imponible = Math.round(
      this.liquidacion.monto_mes +
        this.liquidacion.gratificacion +
        this.liquidacion.valor_horas_extras +
        this.liquidacion.valor_hora_feriado +
        this.liquidacion.bono_produccion +
        this.liquidacion.bono_responsabilidad +
        this.liquidacion.reajuste_retroactivo
    );

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
  /** FIN FUNCIONES  */
}
