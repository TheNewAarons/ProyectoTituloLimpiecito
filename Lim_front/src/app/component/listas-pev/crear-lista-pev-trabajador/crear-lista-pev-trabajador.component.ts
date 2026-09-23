import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CronogramaService } from 'src/app/services/cronograma/cronograma.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';

@Component({
  selector: 'app-crear-lista-pev-trabajador',
  templateUrl: './crear-lista-pev-trabajador.component.html',
  styleUrls: ['./crear-lista-pev-trabajador.component.css']
})
export class CrearListaPevTrabajadorComponent implements OnInit {
  id_cronograma;
  n_empleado;
  tareas_cronograma;
  cronograma;
  cronograma_vista = [];
  sectores = [];
  sector_seleccionado;
  sector_selector = [];
  lista_pev:any= {};
  tareas = [];

  fecha_seleccionada
  constructor(
    private route: ActivatedRoute, private _location: Location,
    private alertaSrv: AlertasService, private _listasPevTrabajadorSrv: ListasPevService,
    private _cronogramaSrv: CronogramaService
  ) {}

  ngOnInit() {
    this.id_cronograma = this.route.snapshot.paramMap.get('id_cronograma');
    this.n_empleado = this.route.snapshot.paramMap.get('n_empleado');
    this.lista_pev = {
      cronogramaId: this.id_cronograma,
      n_empleado: this.n_empleado,
      sectoreId:null
    };
    this.obtenerCronograma();
  }
  volverAtras() {
    this._location.back();
  }
  obtenerCronograma() {
    this.alertaSrv.loading();
    this._cronogramaSrv.obtenerCronograma(this.id_cronograma).subscribe(
      (response: any) => {
        this.alertaSrv.cerrarAlerta();
        this.cronograma = response.cronograma;
        this.obtenerSectoresDesdeCronograma();
      },
      (error) => {
        this.alertaSrv.cerrarAlerta();
        this.alertaSrv.alertaErrorMsj('Hubo un error: ' + error);
      }
    );
  }
  //Obtener Sectores sel cronograma sin repetir
  obtenerSectoresDesdeCronograma() {
    let sector = {
      id: this.cronograma.linea_cronogramas[0].tarea.area.sectore.id,
      nombre: this.cronograma.linea_cronogramas[0].tarea.area.sectore.nombre
    };
    this.sectores.push(sector);
    let existe_sector = false;
    for (let i = 1; i < this.cronograma.linea_cronogramas.length; i++) {
      let sector_aux = {
        id: null,
        nombre: null
      };
      for (let k = 0; k < this.sectores.length; k++) {
        if (this.cronograma.linea_cronogramas[i].tarea.area.sectore.id == this.sectores[k].id) {
          existe_sector = true;
          break;
        } else {
          existe_sector = false;
          sector_aux.id = this.cronograma.linea_cronogramas[i].tarea.area.sectore.id;
          sector_aux.nombre = this.cronograma.linea_cronogramas[i].tarea.area.sectore.nombre;
        }
      }
      if (!existe_sector) {
        this.sectores.push(sector_aux);
      }
    }
  }

  generarNuevaVersion() {
    let fecha_elegida_parse = new Date(this.fecha_seleccionada).toISOString()
    this.cronograma_vista = [];
    let sector_repes = [];
    let area_repes = [];
    this.tareas = []
    this.cronograma.linea_cronogramas.forEach((element) => {
      if (element.tarea.area.sectoreId == this.sector_seleccionado  && element.checkeos.length > 0) {
        let existe_fecha = element.checkeos.find(x => x.fecha == fecha_elegida_parse)
        if(existe_fecha){
          let vista_aux = {
            id_linea_cronograma: element.id,
            id_sector: element.tarea.area.sectoreId,
            n_sector: element.tarea.area.sectore.nombre,
            s_rows: 0,
            id_area: element.tarea.areaId,
            n_area: element.tarea.area.nombre,
            a_rows: 0,
            id_tarea: element.tareaId,
            n_tarea: element.tarea.nombre,
            check: 1
          };
          this.cronograma_vista.push(vista_aux);
          let tarea = {
            tareaId: element.tareaId
          };
          this.tareas.push(tarea);
        }
      }
    });
    this.cronograma_vista.forEach((ele) => {
      let index_sector = sector_repes.findIndex((x: any) => x.id_sector == ele.id_sector);
      if (index_sector == -1) {
        let repe = { id_sector: ele.id_sector, s_rows: 1 };
        sector_repes.push(repe);
        let sec_tor = { id_sector: ele.id_sector, nombre: ele.n_sector };
        this.sector_selector.push(sec_tor);
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
    this.cronograma_vista.forEach((x) => {
      let index = sector_repes.findIndex((y) => y.id_sector == x.id_sector);
      if (index != -1) {
        x.s_rows = sector_repes[index].s_rows;
        sector_repes.splice(index, 1);
      }
      let index_area = area_repes.findIndex((c) => c.id_area == x.id_area);
      if (index_area != -1) {
        x.a_rows = area_repes[index_area].a_rows;
        area_repes.splice(index_area, 1);
      }
    });
  }

  vincularTareas(index) {
    if (this.cronograma_vista[index].check == 0) {
      this.cronograma_vista[index].check = 1;
      let tarea = {
        tareaId: this.cronograma_vista[index].id_tarea
      };
      this.tareas.push(tarea);
    } else {
      this.cronograma_vista[index].check = 0;
      let elementoIndex = this.tareas.findIndex((element) => element.tareaId == this.cronograma_vista[index].id_tarea);
      if (elementoIndex != -1) {
        this.tareas.splice(elementoIndex, 1);
      } else {
        this.alertaSrv.alertaErrorMsj('No existe el elemento o ya se elimino');
      }
    }
  }
  generarListaPev() {
    this.alertaSrv.loading();
    this.lista_pev.fecha_chequeo = this.fecha_seleccionada
    this.lista_pev.sectoreId = this.sector_seleccionado
    this._listasPevTrabajadorSrv.crearListaPev(this.lista_pev, this.tareas).subscribe(
      (response: any) => {
        this.alertaSrv.cerrarAlerta();
        if (response.estado) {
          this.alertaSrv.showNotification(response.mensaje);
          this._location.back()
        } else {
          this.alertaSrv.alertaErrorMsj('Opps..Algo paso ');
        }
      },
      (error) => {
        console.log(error)
        this.alertaSrv.cerrarAlerta();
        this.alertaSrv.alertaErrorMsj('Hubo un error: ' + error);
      }
    );
  }
}
