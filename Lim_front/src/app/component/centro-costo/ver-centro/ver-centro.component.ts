import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { formatDate } from '@angular/common';

import * as html2pdf from 'html2pdf.js';

//SERVICIOS
import { CentroCostoService } from '../../../services/centro_costo/centro-costo.service';
import { ProductoService } from '../../../services/producto/producto.service';
import { TrabajadorService } from '../../../services/trabajador/trabajador.service';
import { CajaService } from '../../../services/caja/caja.service';
import { LoginService } from './../../../services/login/login.service';

//MODELOS
import { CentroTrabajador } from '../../../model/centroTrabajador';
import { CcEgreso } from '../../../model/ccEgreso';
import { CcIngreso } from '../../../model/ccIngreso';
import { ListaInsumo } from '../../../model/lista_insumo';
import { LineaInsumo } from '../../../model/linea_insumo';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ver-centro',
  templateUrl: './ver-centro.component.html',
  styleUrls: ['./ver-centro.component.css']
})
export class VerCentroComponent implements OnInit {
  public centro: any;
  public trabajadores;
  public listaInsumos;
  public egresos;
  public ingresos;
  public idCentro: any;
  public caja_activa;

  public usuario;

  //VARIABLES PARA LOS SELECTORES
  public productos = [];
  public trabajadoresActivos = [];

  //VARIABLES PARA LA CREACION
  public centroTrabajador: CentroTrabajador;
  public listaInsumo: ListaInsumo;
  public lineaInsumo: LineaInsumo;
  public egreso: CcEgreso;
  public ingreso: CcIngreso;
  public producto = null;
  public detalles = [];
  public total = 0;

  //VARIABLE PARA VER LISTA DE INSUMO EN MODAL
  public viewLista;

  public utilidadMoment = 0;
  public total_costosMoment = 0;

  //PARA MOSTRAR
  public totalLista = 0;
  public totalLiquidacion = 0;
  public totalEgresos = 0;


  constructor(
    private centroCostoService: CentroCostoService, private trabajadorService: TrabajadorService,
    private productoService: ProductoService, private route: Router,
    private _route: ActivatedRoute, private cajaService: CajaService,
    private loginService: LoginService , private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerDatos();
    this.obtenerInformacion()
    this.centroTrabajador = new CentroTrabajador(1, null, null, null);
    this.listaInsumo = new ListaInsumo(1, null, null, null, null,null,null);
    this.lineaInsumo = new LineaInsumo(1, null, null, null, '', null, null);
    this.egreso = new CcEgreso(1, '1', '', null, null);
    this.ingreso = new CcIngreso(1, '1', '', null, null);
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatos() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    this.idCentro = this._route.snapshot.paramMap.get('id');
  }
  //OBTENER CAJA ACTIVA, CENTRO COSTO,PRODUCTOS Y TRABAJADORES
  obtenerInformacion(){
    this.alertaService.loading()
    let caja_service = this.cajaService.obtenerCajaActiva()
    let producto_service = this.productoService.obtenerStockProductos()
    let trabajador_service = this.trabajadorService.obtenerTrabajadoresActivos()
    let centro_service = this.centroCostoService.obtenerCentroId(this.idCentro)
    forkJoin([caja_service,producto_service,trabajador_service,centro_service]).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.caja_activa = response[0].caja
        this.productos = response[1].productos
        this.trabajadoresActivos = response[2].trabajadores
        this.transformar()
        this.centro = response[3].centro;
        this.trabajadores = this.centro.centro_costo_trabajadores;
        this.listaInsumos = this.centro.lista_insumos;
        this.egresos = this.centro.cc_egresos;
        this.ingresos = this.centro.cc_ingresos;
        this.obtenerTotalFicticio();
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }
  //OBTENER INFORMACION DEL CENTRO DE COSTO
  obtenerDatosCentroCosto() {
    this.centroCostoService.obtenerCentroId(this.idCentro).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.centro = response.centro;
        this.trabajadores = this.centro.centro_costo_trabajadores;
        this.listaInsumos = this.centro.lista_insumos;
        this.egresos = this.centro.cc_egresos;
        this.ingresos = this.centro.cc_ingresos;
        this.obtenerTotalFicticio();
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //transformar array xd
  transformar() {
    this.trabajadoresActivos.forEach((element) => {
      element.nombre = element.nombre + ' ' + element.apellido;
    });
  }
  //LIMPIAR DATOS
  limpiar() {
    this.centroTrabajador = new CentroTrabajador(1, null, null, null);
    this.listaInsumo = new ListaInsumo(1, null, null, null, null,null,null);
    this.lineaInsumo = new LineaInsumo(1, null, null, null, '', null, null);
    this.egreso = new CcEgreso(1, '1', '', null, null);
    this.ingreso = new CcIngreso(1, '1', '', null, null);
    this.producto = null;
    this.detalles = [];
    this.total = 0;
  }
  //CREAR ASOCIACION
  crearAsociacion(valid) {
    let existe = 0;
    this.centroTrabajador.centroCostoId = this.idCentro;
    this.trabajadores.forEach((element) => {
      if (element.trabajadoreId == this.centroTrabajador.trabajadoreId && element.centroCostoId == this.idCentro) {
        existe = 1;
      }
    });
    if (existe == 0) {
      if (valid) {
        this.alertaService.loading()
        this.centroCostoService.crearAsociacion(this.centroTrabajador).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.centroTrabajador = new CentroTrabajador(1, null, null, null);
            $('#createAsociacion').modal('hide');
            this.alertaService.showNotification('Asociación Creada Correctamente')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    } else {
      $('#createAsociacion').modal('hide');
      alert('¡Trabajador ya asociado!');
    }
  }
  //AGREGAR LINEAS AL DETALLE
  agregarDetalle() {
    if (this.producto.stock >= this.lineaInsumo.cantidad) {
      this.lineaInsumo.nombre = this.producto.nombre;
      this.lineaInsumo.precio = this.producto.precio;
      this.lineaInsumo.total_linea = this.lineaInsumo.cantidad * this.lineaInsumo.precio;
      this.lineaInsumo.productoId = this.producto.id;

      this.detalles.push(this.lineaInsumo);
      this.total += this.lineaInsumo.total_linea;

      this.producto = null;
      this.lineaInsumo = new LineaInsumo(1, null, null, null, '', null, null);
    } else {
      let max = this.producto.stock;
      this.alertaService.showNotification('Stock máximo es de ' + max);
      this.lineaInsumo.cantidad = null;
    }
  }
  //ELIMINAR LINEAS AL DETALLE
  eliminarDetalle(linea) {
    let pos = this.detalles.indexOf(linea);
    this.total -= this.detalles[pos].total_linea;
    this.detalles.splice(pos, 1);
  }
  //CREAR LISTA
  crearLista(valid) {
    if (valid) {
      this.alertaService.loading()
      this.listaInsumo.centroCostoId = this.centro.id;
      this.listaInsumo.total = this.total;
      this.listaInsumo.estado = 0;
      this.listaInsumo.usuarioCreaId = this.usuario.id;
      this.listaInsumo.fecha = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
      this.centroCostoService.crearLista(this.listaInsumo, this.detalles).subscribe(
        (response) => {
          this.limpiar();
          this.obtenerDatosCentroCosto();
          $('#createLista').modal('hide');
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //CREAR EGRESO, LLAMADO PERDIDA
  crearPerdida(valid) {
    if (valid) {
      this.alertaService.loading()
      this.egreso.monto = this.egreso.monto.replace(/,/g, '');
      this.egreso.fecha = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
      this.egreso.centroCostoId = this.centro.id;
      this.centroCostoService.crearEgreso(this.egreso).subscribe(
        (response: any) => {
          this.limpiar();
          this.obtenerDatosCentroCosto();
          $('#createEgreso').modal('hide');
          this.alertaService.alertaExitoMsj('Egreso Creado Correctamente')
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //CREAR INGRESO
  crearIngreso(valid) {
    if (valid) {
      this.alertaService.loading()
      this.ingreso.monto = this.ingreso.monto.replace(/,/g, '');
      this.ingreso.fecha = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
      this.ingreso.centroCostoId = this.centro.id;
      this.centroCostoService.crearIngreso(this.ingreso).subscribe(
        (response: any) => {
          this.limpiar();
          this.obtenerDatosCentroCosto();
          $('#createIngreso').modal('hide');
          this.alertaService.alertaExitoMsj('Ingreso Creado Correctamente')
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  //PASAR DATOS PARA DESPLEGAR
  verLista(listaInsumo) {
    this.viewLista = listaInsumo;
  }
  //APROBAR LISTA Y DESCONTAR STOCK EN PRODUCTOS
  aprobarLista(idLista) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a Aprobar la lista asociada al Centro de costo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Aprobar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.centroCostoService.aprobarLista(idLista,this.usuario.id).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('La Lista ha sido Aprobada.')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
  //ELIMINAR EGRESO
  eliminarEgreso(idEgreso) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a eliminar el Egreso asociado al Centro de costo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.centroCostoService.eliminarEgreso(idEgreso).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('El Egreso ha sido eliminada.')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
  //ELIMINAR INGRESO
  eliminarIngreso(idIngreso) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a eliminar el Ingreso asociado al Centro de costo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.centroCostoService.eliminarIngreso(idIngreso).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('El Ingreso ha sido eliminada.')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
  //ELIMINAR ASOCIACION
  eliminarAsociacion(idAsociacion) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a eliminar la Asociación de este Trabajador al Centro de costo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.centroCostoService.eliminarAsociacion(idAsociacion).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('La Asociación ha sido eliminada.')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }
  //ELIMINAR LISTA
  eliminarLista(idLista) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a eliminar la lista.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaService.loading()
        this.centroCostoService.eliminarLista(idLista).subscribe(
          (response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('La lista ha sido eliminada')
          },
          (error) => {
            this.alertaService.cerrarAlerta()
            console.log(error);
          }
        );
      }
    });
  }

  //METODO PARA IMPRIMIR O EXPORTAR PDF
  imprimir() {
    const options = {
      filename: 'Lista_insumo.pdf',
      html2canvas: {},
      jsPDF: { orientation: 'landscape' }
    };
    const content: Element = document.getElementById('imp');
    html2pdf().from(content).set(options).save();
  }

  //CERRAR CENTRO DE COSTO
  cerrarCentro() {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a Cerrar el Centro de Costo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Cerrar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        let verifica;
        verifica = this.verificarCierre();
        if (verifica == 1) {
          //ENTREGAR LOS DATOS FALTANTES DEL CC
          this.alertaService.loading()
          this.obtenerTotalCostos();
          this.centro.estado = 0;
          this.centro.fecha_cierre = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
          this.centroCostoService.cerrarCentro(this.centro, this.centro.id).subscribe((response: any) => {
            this.obtenerDatosCentroCosto();
            this.alertaService.alertaExitoMsj('El Centro de Costo Ha Sido Cerrado.')
          });
        } else {
          this.alertaService.cerrarAlerta()
          this.alertaService.alertaExitoMsj('Faltan Aprobar Lista de insumos y/o Liquidaciones')
        }
      }
    });
  }
  //VERIFICAR SI SE PUEDE CERRAR EL CENTRO DE COSTO
  verificarCierre() {
    let listaReady = 0;
    let liquidacionReady = 0;
    // verifica si las liquidaciones estan cerradas
    this.trabajadores.forEach((element) => {
      if (element.liquidacione) {
        if (element.liquidacione.estado == 0) {
          liquidacionReady++;
        }
      }
    });
    this.listaInsumos.forEach((elemento) => {
      if (elemento.estado == 1) {
        listaReady++;
      }
    });
    if (listaReady == this.listaInsumos.length && liquidacionReady == this.trabajadores.length) {
      return 1;
    } else {
      return 0;
    }
  }
  //OBTENER TOTAL COSTOS PARA EL CENTRO DE COSTO
  obtenerTotalCostos() {
    let totalLiquidacion = 0;
    this.trabajadores.forEach((element) => {
      if (element.liquidacione) {
        totalLiquidacion += element.liquidacione.liquido_pagar;
      }
    });
    let totalEgresos = 0;
    this.egresos.forEach((elemen) => {
      totalEgresos += elemen.monto;
    });
    this.centro.total_costos = totalLiquidacion + totalEgresos;
    this.centro.utilidad = this.centro.precio_servicio - this.centro.total_costos;
  }

  //OPCIONES PARA QUE FORMATEE VALOR EN INPUT
  cleaveOptions = {
    numeral: true,
    delimiter: ',',
    blocks: [3]
  };
  //VOLVER A CENTROS DE COSTOS
  volverCentros() {
    this.route.navigate(['/centro_costos']);
  }
  //VOLVER A CENTROS DE COSTOS
  volverCajasVer() {
    this.route.navigate(['/cajas/ver/', this.caja_activa.id]);
  }
  //OBTENER DATOS FICTICIOS PARA EL CENTRO DE COSTO
  obtenerTotalFicticio() {
    this.totalLiquidacion = 0;
    this.trabajadores.forEach((element) => {
      if (element.liquidacione) {
        this.totalLiquidacion += element.liquidacione.liquido_pagar;
      }
    });
    this.totalLista = 0;
    this.listaInsumos.forEach((elemento) => {
      if (elemento.estado == 1) {
        this.totalLista += elemento.total;
      }
    });
    this.totalEgresos = 0;
    this.egresos.forEach((elemen) => {
      this.totalEgresos += elemen.monto;
    });
    this.total_costosMoment = this.totalLiquidacion + this.totalEgresos;
    this.utilidadMoment = this.centro.precio_servicio - this.total_costosMoment;
  }

  
}
