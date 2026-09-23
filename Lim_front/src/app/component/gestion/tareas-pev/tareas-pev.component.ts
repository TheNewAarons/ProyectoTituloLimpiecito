import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AreaService } from 'src/app/services/area-pev/area.service';
import { TareaService } from 'src/app/services/tarea-pev/tarea.service';
import { TurnoService } from 'src/app/services/turno-pev/turno.service';
import { TurnoTareaService } from 'src/app/services/turno_tarea-pev/turno-tarea.service';
import { DialogTareaEditarNombreComponent } from '../shared/dialog-tarea-editar-nombre/dialog-tarea-editar-nombre.component';

@Component({
  selector: 'app-tareas-pev',
  templateUrl: './tareas-pev.component.html',
  styleUrls: ['./tareas-pev.component.css']
})
export class TareasPevComponent implements OnInit {
  activo:Boolean = true;
  tareas;
  id_cliente;
  id_area;
  area //para selector
  areas;
  datos_tarea;
  //agregar tarea areas
  tareaForm: FormGroup;
  estados = [
    {value: 0, nombre: 'Inactivo'},
    {value: 1, nombre: 'Activo'}
  ];
  tarea_estado = {
    estado:''
  }
  turno_tarea_estado = {
    estado:''
  }
  turno_tarea = {
    turnoId:'',
    tareaId:'',
    estado:1
  }
  turnos;
  turnos_no_vinculados=[];
  turnos_tareas = []
  id_turno;
  turnos_aux = [];
  //check_turno = false;

  constructor(
    private fb: FormBuilder,
    private _tareaPevSrv: TareaService, private _areaPevSrv: AreaService,
    private _turnoPevSrv: TurnoService, private _turnoTareaPevSrv: TurnoTareaService,
    private route:ActivatedRoute, private _location: Location,
    private router: Router, private _alertaSrv:AlertasService,
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.consultarTurnosPorCliente();
    this.consultarAreasActivasPorCLiente()
    this.iniciarAreaForm()
  }
  volverAtras(){
    this._location.back();
  }

  prepararTurnos(){
    for(let index=0; index < this.turnos.length; index++){
      if(this.turnos[index].estado == 1){
        this.turnos[index].estado_turnoTarea = 0;
        this.turnos_aux.push(this.turnos[index])
      }
    }
  }

  vincularTurnosTareas(id_turno, index_turno){
    if(this.turnos_aux[index_turno].estado_turnoTarea == 0){
      let turno= {
        turnoId:id_turno
      };
      this.turnos_aux[index_turno].estado_turnoTarea = 1;
      //this.turno.turnoId = id_turno
      this.turnos_tareas.push(turno);
    }else if(this.turnos_aux[index_turno].estado_turnoTarea  == 1){
      this.turnos_aux[index_turno].estado_turnoTarea = 0;
      let index:number = this.turnos_tareas.indexOf(this.turnos_tareas.find(x => x.id == id_turno));
      this.turnos_tareas.splice(index, 1);
    }
  }


  consultarTurnosPorCliente(){
    this._alertaSrv.loading()
    //this.id_area = this.area.id
    this._turnoPevSrv.obtenerTurnosPorCliente(this.id_cliente).subscribe(
      (response:any)=>{
        this._alertaSrv.cerrarAlerta()
        this.turnos = response.turnos;
        this.turnos_no_vinculados = Object.values(this.turnos);
        this.prepararTurnos()
      },
      error => {
        console.log(error)
        this._alertaSrv.cerrarAlerta()
        this._alertaSrv.showNotification(error);
      }
    )
  }

  cargarTareas(valor){
    if (valor) {
      this.consultarTareasPorArea();
    }
  }
  consultarTareasPorArea(){
    this._alertaSrv.loading()
    if(this.area){
      this.id_area = this.area.id
    }
    this._tareaPevSrv.obtenerTareasPorArea(this.id_area).subscribe(
      (response:any)=>{
        this._alertaSrv.cerrarAlerta()
        this.tareas = response.tareas;
        for(let i=0; i< this.tareas.length; i++){
          this.tareas[i].turnos_no_vinculados = []
          //let turnos_no_vinculados_aux = this.turnos_no_vinculados.slice()
          let turnos_no_vinculados_aux = JSON.parse(JSON.stringify(this.turnos_no_vinculados))
          for(let j=0; j< this.tareas[i].turnos_tareas.length; j++){
            for(let k=0; k < turnos_no_vinculados_aux.length; k++){
              if( turnos_no_vinculados_aux[k].id == this.tareas[i].turnos_tareas[j].turnoId){
                turnos_no_vinculados_aux[k].estado_turnoTarea = 1;
              }
            }
          }
          this.tareas[i].turnos_no_vinculados.push(turnos_no_vinculados_aux)
        }
      },
      error => {
        console.log(error)
        this._alertaSrv.cerrarAlerta()
        this._alertaSrv.showNotification("Ha ocurrido un error: "+error);
      }
    )
  }
  consultarAreasActivasPorCLiente(){
    this._alertaSrv.loading()
    this._areaPevSrv.obtenerAreasActivasPorCliente(this.id_cliente).subscribe(
      (response:any)=>{
        this._alertaSrv.cerrarAlerta()
        this.areas = response.areas;
        if(this.route.snapshot.paramMap.get('id_area')){
          this.id_area = this.route.snapshot.paramMap.get('id_area')
          this.consultarTareasPorArea()
          this.area = this.areas.find(x => x.id == this.id_area)
        }
      },
      error => {
        console.log(error)
        this._alertaSrv.cerrarAlerta()
        this._alertaSrv.showNotification("Ha ocurrido un error "+ error);
      }
    )
  }
  //Para agregar tarea a un area
  iniciarAreaForm(){
    this.tareaForm = this.fb.group({
      nombre: [null, [Validators.required,Validators.maxLength(100)]],
      estado: [1,[Validators.required,Validators.min(0)]],
    })
  }
  get form(){return this.tareaForm.controls}
  registrar(){
    this._alertaSrv.loading();
    this.datos_tarea = this.tareaForm.value;
    this.datos_tarea.areaId = this.id_area;
    this._tareaPevSrv.crearTarea(this.datos_tarea,this.turnos_tareas).subscribe(
      (response:any) => {
        this._alertaSrv.cerrarAlerta()
        if(response.tarea){
          this._alertaSrv.alertaExitoMsj('Tarea '+response.tarea.nombre+". Creada exitosamente")
          this.consultarTareasPorArea();
        }
      },
      error => {
        this._alertaSrv.cerrarAlerta()
        this._alertaSrv.showNotification("Ha ocurrido un error "+error)
        console.log(error)
      }
    )
  }
  cambiarEstadoTarea(id,estado){
    let mensaje;
    if(estado == 0){
      estado = 1
      mensaje = "estado actualizado a: ACTIVADO"
    }else if(estado == 1){
      estado = 0
      mensaje = "estado actualizado a: DESACTIVADO"
    }
    this.tarea_estado.estado = estado
    this._tareaPevSrv.cambiarEstadoTarea(id,this.tarea_estado).subscribe(
      (response:any) => {
        this.consultarTareasPorArea()
        this._alertaSrv.showNotification(mensaje)
      },
      error => {
        console.log(error)
      }
    )
  }
  cambiarEstadoTurnoTarea(id,estado){
    let mensaje;
    if(estado == 0){
      estado = 1
      mensaje = "Turno actualizado a: ACTIVADO"
    }else if(estado == 1){
      estado = 0
      mensaje = "Turno actualizado a: DESACTIVADO"
    }

    this.turno_tarea_estado.estado = estado
    this._turnoTareaPevSrv.cambiarEstadoTurnoTarea(id,this.turno_tarea_estado).subscribe(
      (response:any) => {
        this.consultarTareasPorArea()
        this._alertaSrv.showNotification(mensaje)
      },
      error => {
        console.log(error)
      }
    )
  }
  vincularUnTurnoATarea(turnoId,tareaId){
    this.turno_tarea.turnoId = turnoId
    this.turno_tarea.tareaId = tareaId
    this._turnoTareaPevSrv.asociarTurnoTarea(this.turno_tarea).subscribe(
      (response:any) => {
        this.consultarTareasPorArea()
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification("Ha ocurrido un error: "+error)
      }
    )
  }

  editarNombre(tarea){
    const dialogRef = this.dialog.open(DialogTareaEditarNombreComponent, {
      width: '600px',
      data: { tarea}
    });

    dialogRef.afterClosed().subscribe(respuesta => {
      if(respuesta){
        this.actualizarTarea(respuesta)
      }
    })
  }

  actualizarTarea(datos){
    let datos_tarea = {
      nombre:datos.nombre,
      areaId:datos.areaId,
      estado:datos.estado
    }
    this._tareaPevSrv.actualizarTarea(datos.id_tarea,datos_tarea).subscribe(
      (response:any)=>{
        this.cargarTareas(1)
        this._alertaSrv.showNotification('Nombre actualizado correctamente')
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification('Ha ocurrido un problema')
      }
    )
  }

  eliminarTarea(id){
    this._alertaSrv.loading()
    this._tareaPevSrv.eliminarTarea(id).subscribe(
      (response:any) => {
        if(response.eliminado){
          this.cargarTareas(1)
        }else{
          this._alertaSrv.alertaErrorMsj('Tarea esta asociada a un cronograma, lista chequeo o supervisor')
        }
      },
      error => {
        console.log(error)
        this._alertaSrv.cerrarAlerta()
      }
    )
  }
}
