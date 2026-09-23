import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { SectorService } from 'src/app/services/sector-pev/sector.service';
import { DialogSectorEditarNombreComponent } from '../dialog-sector-editar-nombre/dialog-sector-editar-nombre.component';

@Component({
  selector: 'app-tabla-cliente-sector-pev',
  templateUrl: './tabla-cliente-sector-pev.component.html',
  styleUrls: ['./tabla-cliente-sector-pev.component.css']
})
export class TablaClienteSectorPevComponent implements OnInit {

  @Input() sectores;
  @Output() cargarSectores = new EventEmitter<Boolean>()
  sector_estado = {
    estado:''
  }
  constructor(
    private _sectoresPevService: SectorService,  private _alertaSrv:AlertasService,
    public dialog: MatDialog,
  ) {}

  ngOnInit() {
  }

  cargaSectores(msg){
    this.cargarSectores.emit(msg);
  }

  cambiarEstadoSector(id,estado){
    let mensaje;
    if(estado == 0){
      estado = 1
      mensaje = "Area actualizado a: ACTIVADO y desplazada hacía ABAJO"
    }else if(estado == 1){
      estado = 0
      mensaje = "Area actualizado a: DESACTIVADO y desplazada hacía ABAJO"
    }
    this.sector_estado.estado = estado
    this._sectoresPevService.cambiarEstadoSector(id,this.sector_estado).subscribe(
      (response:any) => {
        this.cargaSectores(1)
        this._alertaSrv.showNotification(mensaje)
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification(error)
      }
    )
  }

  //* Abrir modal
  editarNombre(sector) {
    const dialogRef = this.dialog.open(DialogSectorEditarNombreComponent, {
      width: '600px',
      data: { sector}
    });

    dialogRef.afterClosed().subscribe(respuesta => {
      if(respuesta){
        this.ActualizarSector(respuesta)
      }
    })
  }

  ActualizarSector(datos){
    let datos_sector = {
      nombre:datos.nombre,
      clienteId:datos.clienteId,
      estado:datos.estado
    }
    console.log('id',datos)
    this._sectoresPevService.actualizarSector(datos.id_sector,datos_sector).subscribe(
      (response:any)=>{
        this.cargaSectores(1)
        this._alertaSrv.showNotification('Nombre actualizado correctamente')
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification('Ha ocurrido un problema')
      }
    )
  }

  eliminarSector(id){
    this._alertaSrv.loading()
    this._sectoresPevService.eliminarSector(id).subscribe(
      (response:any) => {
        if(response.eliminado){
          this.cargaSectores(1)
        }else{
          this._alertaSrv.alertaErrorMsj('Existen áreas asociadas al sector')
        }
      },
      error => {
        console.log(error)
        this._alertaSrv.cerrarAlerta()
      }
    )
  }
}
