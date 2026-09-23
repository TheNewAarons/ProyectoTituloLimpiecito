import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';
import { ListasSupervisorService } from 'src/app/services/listas-supervisor/listas-supervisor.service';

@Component({
  selector: 'app-crear-lista-supervisor',
  templateUrl: './crear-lista-supervisor.component.html',
  styleUrls: ['./crear-lista-supervisor.component.css']
})
export class CrearListaSupervisorComponent implements OnInit {
  id_lista_pev = null;
  trabajadores_supervisor = [];
  listasPevConLineasPev;
  listaSupervisor_vista = [];
  trabajador_seleccionado
  tareas = []

  constructor(
    private route: ActivatedRoute,private router: Router,
    private listaSupervisor: ListasSupervisorService,private alertaSrv: AlertasService,
    private listasPevSrv: ListasPevService, private _location:Location
  ) {}

  ngOnInit() {
    this.id_lista_pev = this.route.snapshot.paramMap.get('id_lista_pev');
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.alertaSrv.loading();
    let obtener_lista_pev = this.listasPevSrv.obtenerListaPevConLineas(this.id_lista_pev);
    let obtener_trabajadores_supervisor = this.listaSupervisor.obtenerTrabajadoresSupervisor();
    forkJoin([obtener_lista_pev, obtener_trabajadores_supervisor]).subscribe(
      (response: any) => {
        this.alertaSrv.cerrarAlerta();
        this.listasPevConLineasPev = response[0].lista_pev_trabajador;
        this.trabajadores_supervisor = response[1].trabajadores;
        this.generarVistaListaSupervisor()
      },
      (error) => {
        this.alertaSrv.cerrarAlerta();
        this.alertaSrv.alertaError();
      }
    );
  }

  volverAtras(){
    this._location.back();
  }

  generarVistaListaSupervisor() {
    this.listaSupervisor_vista = [];
    let sector_repes = [];
    let area_repes = [];
    this.listasPevConLineasPev.linea_lista_pev_trabajadores.forEach((element) => {
      let tarea_aux = { tareaId: element.tareaId}
      this.tareas.push(tarea_aux)
      let vista_aux = {
        hora_1: null,
        despolvado_1: 0,
        aplicacion_producto_1: 0,
        brillantado_1: 0,
        hora_2: null,
        despolvado_2: 0,
        aplicacion_producto_2: 0,
        brillantado_2: 0,
        hora_3: null,
        despolvado_3: 0,
        aplicacion_producto_3: 0,
        brillantado_3: 0,
        observaciones: '',
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

  //CREAR LISTA DE SUPERVISOR
  crearListaSupevisor(){
      this.alertaSrv.loading()
      this.listaSupervisor.crearListaSupervisor(this.listasPevConLineasPev.id,this.trabajador_seleccionado,this.tareas).subscribe(
        (response:any) => {
          this.alertaSrv.cerrarAlerta()
          if(response.estado){
            this.alertaSrv.showNotification('Lista de supervisor creada correctamente')
            this.volverAtras()
          }
        },
        error => {
          console.log(error)
          this.alertaSrv.cerrarAlerta()
          this.alertaSrv.alertaError()
        }
      )
  }
}
