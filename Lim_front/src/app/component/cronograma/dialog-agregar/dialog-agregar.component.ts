import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CronogramaService } from 'src/app/services/cronograma/cronograma.service';

@Component({
  selector: 'app-dialog-agregar',
  templateUrl: './dialog-agregar.component.html',
  styleUrls: ['./dialog-agregar.component.css']
})
export class DialogAgregarComponent implements OnInit {

  cronograma_original
  base_cronograma
  tareas_turno = []
  loader = true
  constructor(
    private cronogramaSrv:CronogramaService,
    public dialogRef:MatDialogRef<DialogAgregarComponent>,@Inject(MAT_DIALOG_DATA) public data:any
  ) { }

  ngOnInit() {
    this.cronograma_original = this.data.cronograma
    this.obtenerBaseCronograma()
  }

  obtenerBaseCronograma(){
    this.cronogramaSrv.obtenerTareaTurnoPorTurnoId(this.cronograma_original.turnoId).subscribe(
      (response:any) => {
        this.tareas_turno = response.tareas
        this.generarVistaOrdenada(response.tareas)
        this.loader = !this.loader
      },
      error => {
        console.log(error)
      }
    )
  }
  //* Genera la vista ordenada para su visualización
  generarVistaOrdenada(tareas) {
    //* Primero se quita las tareas ya asociadas
    this.cronograma_original.linea_cronogramas.forEach(ele => {
      let index_tarea = tareas.findIndex(x => x.tareaId === ele.tareaId)
      if(index_tarea != -1){
        this.tareas_turno.splice(index_tarea,1)
      }
    })

    //* Luego se genera la vista ordenada
    this.base_cronograma = [];
    this.tareas_turno.forEach((e: any) => {
      let index_sector = this.base_cronograma.findIndex((x: any) => x.id_sector === e.tarea.area.sectoreId);
      if (index_sector == -1) {
        let sector_aux = { id_sector: e.tarea.area.sectoreId, nombre: e.tarea.area.sectore.nombre,areas: []};
        let area_aux = { id_area: e.tarea.areaId,nombre: e.tarea.area.nombre,tareas: [{id_tarea: e.tareaId,nombre: e.tarea.nombre}]};
        sector_aux.areas.push(area_aux);
        this.base_cronograma.push(sector_aux);
      } else {
        let index_area = this.base_cronograma[index_sector].areas.findIndex((y: any) => y.id_area === e.tarea.areaId);
        if (index_area == -1) {
          let area_aux_2 = {id_area: e.tarea.areaId,nombre: e.tarea.area.nombre,tareas: [{id_tarea: e.tareaId,nombre: e.tarea.nombre}]};
          this.base_cronograma[index_sector].areas.push(area_aux_2);
        } else {
          let tarea_aux = {id_tarea: e.tareaId,nombre: e.tarea.nombre};
          this.base_cronograma[index_sector].areas[index_area].tareas.push(tarea_aux);
        }
      }
    });
  }

  agregarTarea(tarea,id_sector){
    let linea = {
      tareaId:tarea.id_tarea,
      cronogramaId: this.cronograma_original.id
    }
    this.cronogramaSrv.crearLineaCronograma(linea,id_sector).subscribe(
      (response:any) => {
        if(response.linea_cronograma){
          this.cerrarModal(true)
        }
      },
      error => {console.log(error)}
    )
  }

  cerrarModal(valor): void {
    this.dialogRef.close(valor);
  }

}
