import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Cronograma } from 'src/app/model/cronograma';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CronogramaService } from 'src/app/services/cronograma/cronograma.service';
import { TurnoService } from 'src/app/services/turno-pev/turno.service';

@Component({
  selector: 'app-crear-cronograma',
  templateUrl: './crear-cronograma.component.html',
  styleUrls: ['./crear-cronograma.component.css']
})
export class CrearCronogramaComponent implements OnInit {
  id_cliente;
  turnos = [];
  turnos_disponibles = []
  id_turno: number;
  tareas_turno: [] = [];
  cronograma: any[] = [];

  cronograma_crear: Cronograma;

  meses = [
    { valor: 0, nombre: 'Enero' },{ valor: 1, nombre: 'Febrero' },{ valor: 2, nombre: 'Marzo' },
    { valor: 3, nombre: 'Abril' },{ valor: 4, nombre: 'Mayo' },{ valor: 5, nombre: 'Junio' },
    { valor: 6, nombre: 'Julio' },{ valor: 7, nombre: 'Agosto' },{ valor: 8, nombre: 'Septiembre' },
    { valor: 9, nombre: 'Octubre' },{ valor: 10, nombre: 'Noviembre' },{ valor: 11, nombre: 'Diciembre' }
  ];
  id_mes: number;
  fecha_inicio;
  fecha_termino;
  lineas_cronograma: any[] = [];

  modo_editar: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private alertaService: AlertasService,
    private cronogramaService: CronogramaService,
    private router: Router,
    private location:Location
  ) {}

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.obtenerDatos();
    let fecha_hoy = new Date();
    this.cronograma_crear = new Cronograma(0, fecha_hoy.getFullYear(), null, 1, null, null, this.id_cliente, null);
  }

  volver(){
    this.location.back()
  }

  obtenerDatos() {
    this.alertaService.loading();
    this.cronogramaService.obtenerTurnosPorCliente(this.id_cliente).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta();
        this.turnos = response.turnos;
        if(this.turnos.length === 0){
          this.alertaService.alertaErrorMsj('No existen Turnos creados para generar Cronogramas')
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta();
      }
    )
  }

  obtenerDatosMes(){
    this.alertaService.loading()
    this.cronogramaService.obtenerCronogramaActivosMes(this.id_cliente,this.id_mes).subscribe(
      (response:any) => {
        this.alertaService.cerrarAlerta();
        if(response.mensaje){
          this.alertaService.alertaErrorMsj(response.mensaje)
        }
        this.turnos_disponibles = response.turnos
      },
      error => {
        this.alertaService.cerrarAlerta();
      }
    )
  }

  obtenerTareasTurnos() {
    this.alertaService.loading();
    this.cronogramaService.obtenerTareaTurnoPorTurnoId(this.id_turno).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta();
        this.tareas_turno = response.tareas;
        this.generarVistaOrdenada();
      },
      (error) => {
        this.alertaService.cerrarAlerta();
        console.log(error);
      }
    );
  }

  generarVistaOrdenada() {
    this.cronograma = [];
    this.tareas_turno.forEach((e: any) => {
      let index_sector = this.cronograma.findIndex((x: any) => x.id_sector === e.tarea.area.sectoreId);
      if (index_sector == -1) {
        let sector_aux = { id_sector: e.tarea.area.sectoreId, nombre: e.tarea.area.sectore.nombre,areas: []};
        let area_aux = { id_area: e.tarea.areaId,nombre: e.tarea.area.nombre,tareas: [{id_tarea: e.tareaId,nombre: e.tarea.nombre,estado: 1}]};
        sector_aux.areas.push(area_aux);
        this.cronograma.push(sector_aux);
      } else {
        let index_area = this.cronograma[index_sector].areas.findIndex((y: any) => y.id_area === e.tarea.areaId);
        if (index_area == -1) {
          let area_aux_2 = {id_area: e.tarea.areaId,nombre: e.tarea.area.nombre,tareas: [{id_tarea: e.tareaId,nombre: e.tarea.nombre,estado: 1}]};
          this.cronograma[index_sector].areas.push(area_aux_2);
        } else {
          let tarea_aux = {id_tarea: e.tareaId,nombre: e.tarea.nombre,estado: 1};
          this.cronograma[index_sector].areas[index_area].tareas.push(tarea_aux);
        }
      }
    });
  }

  generarLineasCronograma() {
    this.lineas_cronograma = [];
    this.cronograma.forEach((x) => {
      x.areas.forEach((el) => {
        el.tareas.forEach((ele) => {
          if (ele.estado) {
            let linea = { tareaId: 0, cronogramaId: 0};
            linea.tareaId = ele.id_tarea;
            this.lineas_cronograma.push(linea);
          }
        });
      });
    });
  }

  pasarAEditar() {
    this.modo_editar = !this.modo_editar;
  }

  activarTarea(id_tarea, id_area, id_sector) {
    let index_sector = this.cronograma.find((x) => x.id_sector == id_sector);
    let index_area = index_sector.areas.find((y: any) => y.id_area == id_area);
    let index_tarea = index_area.tareas.find((n) => n.id_tarea == id_tarea);
    index_tarea.estado = 1;
  }

  desactivarTarea(id_tarea, id_area, id_sector) {
    let index_sector = this.cronograma.find((x) => x.id_sector == id_sector);
    let index_area = index_sector.areas.find((y: any) => y.id_area == id_area);
    let index_tarea = index_area.tareas.find((n) => n.id_tarea == id_tarea);
    index_tarea.estado = 0;
  }

  crearCronograma() {
    this.cronograma_crear.fecha = new Date();
    this.cronograma_crear.mes = this.id_mes;
    this.cronograma_crear.turnoId = this.id_turno;
    this.cronograma_crear.fecha_inicio = this.fecha_inicio;
    this.cronograma_crear.fecha_termino = this.fecha_termino;
    this.alertaService.loading();
    this.generarLineasCronograma();
    this.cronogramaService.crearCronograma(this.cronograma_crear, this.lineas_cronograma).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta();
        if (response.cronograma) {
          this.alertaService.showNotification('Cronograma creado');
          this.volver()
        } else {
          this.alertaService.alertaError();
        }
      },
      (error) => {
        this.alertaService.cerrarAlerta();
        this.alertaService.alertaError();
        console.log(error);
      }
    );
  }
}
