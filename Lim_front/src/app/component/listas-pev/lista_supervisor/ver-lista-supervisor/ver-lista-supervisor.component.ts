import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasSupervisorService } from 'src/app/services/listas-supervisor/listas-supervisor.service';

import swal from 'sweetalert2'
import { DialogImprimirListaSupervisorComponent } from '../../dialog-imprimir-lista-supervisor/dialog-imprimir-lista-supervisor.component';

@Component({
  selector: 'app-ver-lista-supervisor',
  templateUrl: './ver-lista-supervisor.component.html',
  styleUrls: ['./ver-lista-supervisor.component.css']
})
export class VerListaSupervisorComponent implements OnInit {

  id_lista_supervisor = null;
  listasSupervisorConLineas;
  listaSupervisor_vista = [];
  supervisor
  nombre_cliente:string
  turno:string
  estado_cronograma

  constructor(
    private route: ActivatedRoute,private router: Router,
    private listaSupervisor: ListasSupervisorService,private alertaSrv: AlertasService,
    private _location:Location,public dialog: MatDialog
  ) { }

  ngOnInit() {
    this.id_lista_supervisor = this.route.snapshot.paramMap.get('id_lista_supervisor');
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre');
    this.turno = this.route.snapshot.paramMap.get('turno');
    this.obtenerDatos();
  }
  volverAtras(){
    this._location.back()
  }

  obtenerDatos(){
    this.alertaSrv.loading()
    this.listaSupervisor.obtenerListaSupervisor(this.id_lista_supervisor).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        this.listasSupervisorConLineas = response.lista_super_trabajador
        this.estado_cronograma = response.cronograma.estado
        this.generarVistaListaSupervisor()
        this.obtenerTrabajador(response.lista_super_trabajador.n_empleado)
      },
      error => {
        console.log(error)
        this.alertaSrv.cerrarAlerta()
        this.alertaSrv.alertaError()
      }
    )
  }

  obtenerTrabajador(n_empleado){
    this.alertaSrv.loading()
    this.listaSupervisor.obtenerTrabajador(n_empleado).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        this.supervisor = response.trabajador
      },
      error => {
        console.log(error)
        this.alertaSrv.cerrarAlerta()
      }
    )
  }

  generarVistaListaSupervisor() {
    this.listaSupervisor_vista = [];
    let sector_repes = [];
    let area_repes = [];
    this.listasSupervisorConLineas.linea_lista_super_trabajadores.forEach((element) => {
      let vista_aux = {
        id:element.id,
        hora_1: element.hora_1,
        despolvado_1: element.despolvado_1,
        aplicacion_producto_1: element.aplicacion_producto_1,
        abrillantado_1: element.abrillantado_1,
        hora_2: element.hora_2,
        despolvado_2: element.despolvado_2,
        aplicacion_producto_2: element.aplicacion_producto_2,
        abrillantado_2: element.abrillantado_2,
        hora_3: element.hora_3,
        despolvado_3: element.despolvado_3,
        aplicacion_producto_3: element.aplicacion_producto_3,
        abrillantado_3: element.abrillantado_3,
        observaciones: element.observaciones,
        n_sector: element.tarea.area.sectore.nombre,
        s_rows: 0,
        id_area: element.tarea.areaId,
        n_area: element.tarea.area.nombre,
        a_rows: 0,
        id_tarea: element.tareaId,
        n_tarea: element.tarea.nombre
      };
      this.listaSupervisor_vista.push(vista_aux);
    });

    this.listaSupervisor_vista.forEach((ele) => {
      let index_sector = sector_repes.findIndex((x: any) => x.id_sector == ele.id_sector);
      if (index_sector == -1) {
        let repe = { id_sector: ele.id_sector, s_rows: 1 };
        sector_repes.push(repe);
      } else {
        sector_repes[index_sector].s_rows++;
      }
      let index_area = area_repes.findIndex((x: any) => x.id_area == ele.id_area);
      if (index_area == -1) {
        let repe = { id_area: ele.id_area, a_rows: 1 };
        area_repes.push(repe);
      } else {
        area_repes[index_area].a_rows++;
      }
    });

    //* Colocar las lineas repetidas en su respectiva linea
    this.listaSupervisor_vista.forEach(x => {
      let index = sector_repes.findIndex( y => y.id_sector == x.id_sector)
      if(index != -1){
        x.s_rows = sector_repes[index].s_rows
        sector_repes.splice(index,1)
      }
      let index_area = area_repes.findIndex(c => c.id_area == x.id_area)
      if(index_area != -1){
        x.a_rows = area_repes[index_area].a_rows
        area_repes.splice(index_area,1)
      }
    })
  }

  //Actualizar linea
  actualizarLinea(id, linea){
    this.listaSupervisor.actualizarLineaListaSupervisor(id,linea).subscribe(
      (response:any)=>{
        this.alertaSrv.cerrarAlerta();
        if(response.estado){
          this.alertaSrv.showNotification(response.mensaje)
        }else{
          this.alertaSrv.showNotification(response.mensaje)
        }
      },error => {
        this.alertaSrv.cerrarAlerta();
        this.alertaSrv.alertaErrorMsj("Ha ocurrido un error"+error)
      }
    )
  }

  marcarDespolvado1(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].despolvado_1 == 0){
      this.listaSupervisor_vista[index].despolvado_1 = 1;
    }else{
      this.listaSupervisor_vista[index].despolvado_1 = 0;
    }
    let linea_lista_supervisor = {
      despolvado_1:this.listaSupervisor_vista[index].despolvado_1,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarDespolvado2(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].despolvado_2 == 0){
      this.listaSupervisor_vista[index].despolvado_2 = 1;
    }else{
      this.listaSupervisor_vista[index].despolvado_2 = 0;
    }
    let linea_lista_supervisor = {
      despolvado_2:this.listaSupervisor_vista[index].despolvado_2,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarDespolvado3(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].despolvado_3 == 0){
      this.listaSupervisor_vista[index].despolvado_3 = 1;
    }else{
      this.listaSupervisor_vista[index].despolvado_3 = 0;
    }
    let linea_lista_supervisor = {
      despolvado_3:this.listaSupervisor_vista[index].despolvado_3,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAplProducto1(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].aplicacion_producto_1 == 0){
      this.listaSupervisor_vista[index].aplicacion_producto_1 = 1;
    }else{
      this.listaSupervisor_vista[index].aplicacion_producto_1 = 0;
    }
    let linea_lista_supervisor = {
      aplicacion_producto_1:this.listaSupervisor_vista[index].aplicacion_producto_1,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAplProducto2(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].aplicacion_producto_2 == 0){
      this.listaSupervisor_vista[index].aplicacion_producto_2 = 1;
    }else{
      this.listaSupervisor_vista[index].aplicacion_producto_2 = 0;
    }
    let linea_lista_supervisor = {
      aplicacion_producto_2:this.listaSupervisor_vista[index].aplicacion_producto_2,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAplProducto3(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].aplicacion_producto_3 == 0){
      this.listaSupervisor_vista[index].aplicacion_producto_3 = 1;
    }else{
      this.listaSupervisor_vista[index].aplicacion_producto_3 = 0;
    }
    let linea_lista_supervisor = {
      aplicacion_producto_3:this.listaSupervisor_vista[index].aplicacion_producto_3,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAbrillantado1(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].abrillantado_1 == 0){
      this.listaSupervisor_vista[index].abrillantado_1 = 1;
    }else{
      this.listaSupervisor_vista[index].abrillantado_1 = 0;
    }
    let linea_lista_supervisor = {
      abrillantado_1:this.listaSupervisor_vista[index].abrillantado_1,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAbrillantado2(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].abrillantado_2 == 0){
      this.listaSupervisor_vista[index].abrillantado_2 = 1;
    }else{
      this.listaSupervisor_vista[index].abrillantado_2 = 0;
    }
    let linea_lista_supervisor = {
      abrillantado_2:this.listaSupervisor_vista[index].abrillantado_2,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  marcarAbrillantado3(index){
    this.alertaSrv.loading();
    if(this.listaSupervisor_vista[index].abrillantado_3 == 0){
      this.listaSupervisor_vista[index].abrillantado_3 = 1;
    }else{
      this.listaSupervisor_vista[index].abrillantado_3 = 0;
    }
    let linea_lista_supervisor = {
      abrillantado_3:this.listaSupervisor_vista[index].abrillantado_3,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  actualizarObservaciones(index){
    let linea_lista_supervisor= {
      observaciones:this.listaSupervisor_vista[index].observaciones,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  generarHora1(index){
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL',{
      timeZone: "America/Santiago",
      hour12: false, // false
      hour: "numeric", // 2-digit
      minute: "2-digit", // numeric
      second: "2-digit" // numeric
    });
    this.listaSupervisor_vista[index].hora_1 = now;
    let linea_lista_supervisor = {
      hora_1:this.listaSupervisor_vista[index].hora_1,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  generarHora2(index){
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL',{
      timeZone: "America/Santiago",
      hour12: false, // false
      hour: "numeric", // 2-digit
      minute: "2-digit", // numeric
      second: "2-digit" // numeric
    });
    this.listaSupervisor_vista[index].hora_2 = now;
    let linea_lista_supervisor = {
      hora_2:this.listaSupervisor_vista[index].hora_2,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  generarHora3(index){
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL',{
      timeZone: "America/Santiago",
      hour12: false, // false
      hour: "numeric", // 2-digit
      minute: "2-digit", // numeric
      second: "2-digit" // numeric
    });
    this.listaSupervisor_vista[index].hora_3 = now;
    let linea_lista_supervisor = {
      hora_3:this.listaSupervisor_vista[index].hora_3,
    }
    this.actualizarLinea(this.listaSupervisor_vista[index].id,linea_lista_supervisor)
  }

  cambiarEstadoListaSupervisor(){
    let lista_supervisor ={
      estado:2,
      fecha_firma:new Date().toISOString()
    }
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a finalizar y firmar esta Lista Supervisor y ya no podras modificarla',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, !Finalizar y Firmar¡',
      cancelButtonText: 'Cancelar',
    }).then((results) => {
      if(results.value){
        this.alertaSrv.loading()
        this.listaSupervisor.cambiarEstadoListaSupervisor(this.listasSupervisorConLineas.id,lista_supervisor).subscribe(
          (response:any) => {
            if(response.estado){
              this.alertaSrv.showNotification(response.mensaje)
              this.obtenerDatos()
            }else{
              this.alertaSrv.cerrarAlerta()
              this.alertaSrv.showNotification(response.mensaje)
            }
          },
          error => {
            console.log(error)
            this.alertaSrv.cerrarAlerta()
            this.alertaSrv.alertaError()
          }
        )
      }
    })
  }

  abrirVistaImpresion() {
    const dialogRef = this.dialog.open(DialogImprimirListaSupervisorComponent, {
      width: 'auto',
      // height:'800px',
      data: {  nombre_cliente:this.nombre_cliente, supervisor:this.supervisor,listasSupervisorConLineas:this.listasSupervisorConLineas,listaSupervisor_vista:this.listaSupervisor_vista, turno:this.turno}
    });

    dialogRef.afterClosed().subscribe(() => {
    });
  }

}
