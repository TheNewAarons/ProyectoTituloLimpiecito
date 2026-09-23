import { Component, OnInit , LOCALE_ID, Inject } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CheckeoService } from 'src/app/services/checkeo/checkeo.service';
import { CronogramaService } from 'src/app/services/cronograma/cronograma.service';
import { DialogCronogramaComponent } from '../dialog-cronograma/dialog-cronograma.component';

import * as moment from 'moment'

@Component({
  selector: 'app-ver-cronograma',
  templateUrl: './ver-cronograma.component.html',
  styleUrls: ['./ver-cronograma.component.css']
})
export class VerCronogramaComponent implements OnInit {

  id_cliente: number;
  id_cronograma: number;
  cronograma;
  cronograma_vista = []
  fechas = []
  turno

  //*
  base_cronograma = [] //Variable para guardar la base del cronograma creado
  cronograma_ordenado = [] //Almacena el orden del cronograma

  cant_semanas = 0
  semanas = []

  constructor(
    private alertaSrv: AlertasService, private route: ActivatedRoute,
    private cronogramaSrv: CronogramaService, private checkeoSrv:CheckeoService,
    public dialog:MatDialog,
    @Inject(LOCALE_ID) public locale:string
    ) {}

  ngOnInit() {
    this.id_cliente = Number(this.route.snapshot.paramMap.get('id_cliente'));
    this.id_cronograma = Number(this.route.snapshot.paramMap.get('id_cronograma'));
    this.turno = this.route.snapshot.paramMap.get('turno')
    this.obtenerCronograma()
  }
  //* Obtiene el cronograma con sus respectivas tareas
  obtenerCronograma() {
    this.alertaSrv.loading();
    this.cronogramaSrv.obtenerCronograma(this.id_cronograma).subscribe(
      (response: any) => {
        this.alertaSrv.cerrarAlerta();
        this.cronograma = response.cronograma;
        this.generarDias(this.cronograma.fecha_inicio, this.cronograma.fecha_termino)
        this.generarNuevaVersion()
      },
      (error) => {
        this.alertaSrv.cerrarAlerta();
        console.log(error);
      }
    );
  }
  //* Genera los días que hay entre la fecha de inicio y termino
  generarDias(fecha_inicio,fecha_termino){
    const f_inicio = moment.utc(fecha_inicio).add(1,'days')
    const f_termino = moment.utc(fecha_termino).add(1,'days')
    const cantidad_dias = f_termino.diff(f_inicio,'days') +2
    this.semanas = []
    this.fechas = []

    for(let i=1; i< cantidad_dias;i++){
      let fecha_crear = moment(fecha_inicio).add(i,'days').format('yyyy-MM-DD')
      let fecha_comparar = new Date(fecha_crear).toISOString()
      let fecha_aux = {
        fecha_ver:moment(fecha_inicio).add(i,'days'),
        fecha_crear,
        fecha_comparar
      }
      this.fechas = [...this.fechas, fecha_aux ]
    }
    this.cant_semanas = this.fechas.length/7

    for(let i = 0; i < this.cant_semanas; i++){
      let semana = { nombre:`Semana ${i+1}`}
      this.semanas.push(semana)
    }

  }
  //* Genera vista del cronograma
  generarNuevaVersion(){
    this.cronograma_ordenado = []
    this.cronograma_vista = []
    let sector_repes = []
    let area_repes = []
    this.base_cronograma = []; // la base cronograma
    this.cronograma.linea_cronogramas.forEach(element => {
      //* Se genera la vista base del cronograma
      let index_sector = this.base_cronograma.findIndex((x: any) => x.id_sector === element.tarea.area.sectoreId);
      if (index_sector == -1) {
        let sector_aux = { id_sector: element.tarea.area.sectoreId, nombre: element.tarea.area.sectore.nombre,areas: []};
        let area_aux = { id_area: element.tarea.areaId,nombre: element.tarea.area.nombre,tareas: [{id_tarea: element.tareaId,nombre: element.tarea.nombre}]};
        sector_aux.areas.push(area_aux);
        this.base_cronograma.push(sector_aux);
      } else {
        let index_area = this.base_cronograma[index_sector].areas.findIndex((y: any) => y.id_area === element.tarea.areaId);
        if (index_area == -1) {
          let area_aux_2 = {id_area: element.tarea.areaId,nombre: element.tarea.area.nombre,tareas: [{id_tarea: element.tareaId,nombre: element.tarea.nombre}]};
          this.base_cronograma[index_sector].areas.push(area_aux_2);
        } else {
          let tarea_aux = {id_tarea: element.tareaId,nombre: element.tarea.nombre};
          this.base_cronograma[index_sector].areas[index_area].tareas.push(tarea_aux);
        }
      }

      //* se genera la lista de checkeos de todos los días a mostrar.
      let lista_checkeos = []
      this.fechas.forEach(ele => {
        let lista_check = {
          id:null,
          check:false,
          fecha:ele,
          comentario:'',
          lineaCronogramaId:element.id
        }
        lista_checkeos.push(lista_check)
      })

      //* editar la lista de checkeo según la lista de checkeos original creado
      if(element.checkeos.length > 0){
        element.checkeos.forEach(ele => {
            let index = lista_checkeos.findIndex(x => x.fecha.fecha_comparar == ele.fecha)
            if(index != -1){
              lista_checkeos[index].id = ele.id
              lista_checkeos[index].check = true
              lista_checkeos[index].comentario = ele.comentario
            }
        });
      }

      //* se genera 1 lina de cronograma con su respectiva lista de checkeo
      let vista_aux = {
          id_linea_cronograma:element.id,
          id_sector:element.tarea.area.sectoreId,
          n_sector:element.tarea.area.sectore.nombre,
          s_rows:0,
          id_area:element.tarea.areaId,
          n_area:element.tarea.area.nombre,
          a_rows:0,
          id_tarea:element.tareaId,
          n_tarea:element.tarea.nombre,
          checkeos:lista_checkeos
      }
      this.cronograma_vista.push(vista_aux)
    });
    this.cronograma_vista.forEach(ele => {
      let index_sector = sector_repes.findIndex((x:any) => x.id_sector == ele.id_sector)
      if(index_sector == -1){
        let repe = {id_sector: ele.id_sector,s_rows:1}
        sector_repes.push(repe)
      }else{
        sector_repes[index_sector].s_rows ++
      }
      let index_area = area_repes.findIndex((x:any) => x.id_area == ele.id_area)
      if(index_area == -1){
        let repe = {id_area: ele.id_area,a_rows:1}
        area_repes.push(repe)
      }else{
        area_repes[index_area].a_rows ++
      }
    })

    //* Colocar las lineas repetidas en su respectiva linea
    this.cronograma_vista.forEach(x => {
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

    //* Ordenar vista cronograma
    this.base_cronograma.forEach(ele => {
      ele.areas.forEach(element => {
        this.cronograma_vista.forEach(x => {
          if(ele.id_sector == x.id_sector && element.id_area == x.id_area){
            this.cronograma_ordenado.push(x)
          }
        });
      });
    })
  }

  finalizar(){
    this.alertaSrv.loading()
    this.cronogramaSrv.finalizarCronograma(this.id_cronograma).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        if(response.finalizado){
          this.alertaSrv.showNotification('Cronograma Finalizado Correctamente')
          this.obtenerCronograma()
        }else{
          this.alertaSrv.alertaErrorMsj(`Hay ${response.cantidad_lista_pev} lista(s) de chequeo sin cerrar y ${response.cantidad_lista_super} lista(s) de supervisor sin cerrar`)
        }
      },
      error => {
        this.alertaSrv.alertaError()
      }
    )
  }

  abrirModal(valor){
    const dialogRef = this.dialog.open(DialogCronogramaComponent,{
      width:'600px',
      data:{objeto:valor}
    })
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        if(!result.linea_antigua.check && result.linea_nueva.check){
          this.alertaSrv.loading()
          delete result.linea_nueva.id
          this.checkeoSrv.crearCheckeo(result.linea_nueva).subscribe(
            (response:any) => {
              this.obtenerCronograma()
              this.alertaSrv.showNotification('Activad creada correctamente')
            },
            error => {
              console.log(error)
              this.alertaSrv.cerrarAlerta()
              this.alertaSrv.alertaError()
            }
          )
        }else if(result.linea_antigua.check && result.linea_nueva.check){
          this.alertaSrv.loading()
          this.checkeoSrv.editarCheckeo(result.linea_nueva.id,result.linea_nueva).subscribe(
            (response:any) => {
              this.obtenerCronograma()
              this.alertaSrv.showNotification('Dia editado correctamente')
            },
            error => {
              console.log(error)
              this.alertaSrv.loading()
            }
          )
        }else if(result.linea_antigua.check && !result.linea_nueva.check){
          this.alertaSrv.loading()
          this.checkeoSrv.eliminarCheckeo(result.linea_nueva.id).subscribe(
            (response:any) => {
              this.obtenerCronograma()
              this.alertaSrv.showNotification('Dia de trabajo Eliminado')
            },
            error => {
              console.log('error')
              this.alertaSrv.alertaError()
              this.alertaSrv.alertaError()
            }
          )
        }
      }
    })
  }

}
