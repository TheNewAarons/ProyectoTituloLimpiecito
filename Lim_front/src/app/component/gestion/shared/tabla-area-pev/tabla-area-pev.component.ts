import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AreaService } from 'src/app/services/area-pev/area.service';
import { DialogAreaEditarNombreComponent } from '../dialog-area-editar-nombre/dialog-area-editar-nombre.component';

@Component({
  selector: 'app-tabla-area-pev',
  templateUrl: './tabla-area-pev.component.html',
  styleUrls: ['./tabla-area-pev.component.css']
})
export class TablaAreaPevComponent implements OnInit {

  @Input() areas;
  @Input() id_cliente;
  @Output() cargarAreas = new EventEmitter<Boolean>()
  area_estado = {
    estado:''
  }
  constructor(
    private _areaPevSrv: AreaService, private _alertaSrv:AlertasService,
    public dialog: MatDialog,
  ) { }

  ngOnInit() {
  }

  cargarAreasPev(msg){
    this.cargarAreas.emit(msg);
  }

  cambiarEstadoArea(id,estado){
    let mensaje;
    if(estado == 0){
      estado = 1
      mensaje = "Area actualizado a: ACTIVADO"
    }else if(estado == 1){
      estado = 0
      mensaje = "Area actualizado a: DESACTIVADO"
    }
    this.area_estado.estado = estado
    this._areaPevSrv.cambiarEstadoArea(id,this.area_estado).subscribe(
      (response:any) => {
        this.cargarAreasPev(1)
        this._alertaSrv.showNotification(mensaje)
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification(error)
      }
    )
  }

  //* Abrir modal
  editarNombre(area) {
    const dialogRef = this.dialog.open(DialogAreaEditarNombreComponent, {
      width: '600px',
      data: { area}
    });

    dialogRef.afterClosed().subscribe(respuesta => {
      if(respuesta){
        this.ActualizarArea(respuesta)
      }
    })
  }

  ActualizarArea(datos){
    let datos_area = {
      nombre:datos.nombre,
      sectoreId:datos.sectoreId,
      estado:datos.estado
    }
    this._areaPevSrv.actualizarArea(datos.id_area,datos_area).subscribe(
      (response:any)=>{
        this.cargarAreasPev(1)
        this._alertaSrv.showNotification('Nombre actualizado correctamente')
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification('Ha ocurrido un problema')
      }
    )
  }

  eliminarArea(id){
    this._alertaSrv.loading()
    this._areaPevSrv.eliminarArea(id).subscribe(
      (response:any) => {
        if(response.eliminado){
          this.cargarAreasPev(1)
        }else{
          this._alertaSrv.alertaErrorMsj('Existen tareas asociados')
        }
      },
      error => {
        console.log(error)
        this._alertaSrv.alertaError()
      }
    )
  }

}
