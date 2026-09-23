import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';

@Component({
  selector: 'app-ver-listas-pev',
  templateUrl: './ver-listas-pev.component.html',
  styleUrls: ['./ver-listas-pev.component.css']
})
export class VerListasPevComponent implements OnInit {
  id_cronograma;
  trabajadores_cronograma;
  id_cliente;
  nombre_cliente;
  turno
  estado_cronograma
  constructor(
    private route:ActivatedRoute,private _listasPevSrv: ListasPevService,
    private _location: Location, private alertaSrv:AlertasService
  ) { }

  ngOnInit() {
    this.id_cronograma = this.route.snapshot.paramMap.get('id_cronograma')
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre')
    this.turno = this.route.snapshot.paramMap.get('turno')
    this.obtenerTrabajadoresCronograma()
  }

  volverAtras(){
    this._location.back();
  }

  obtenerTrabajadoresCronograma(){
    this.alertaSrv.loading()
    this._listasPevSrv.obtenerTrabajadoresCronograma(this.id_cronograma).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        this.estado_cronograma = response.cronograma.estado
        this.trabajadores_cronograma = response.trabajadores;
      },error => {
        console.log(error);
        this.alertaSrv.cerrarAlerta()
        this.alertaSrv.alertaError()
      }
    )
  }

  quitarTrabajador(id,n_empleado){
    this.alertaSrv.loading()
    this._listasPevSrv.quitarTrabajadorCronograma(id,n_empleado).subscribe(
      (response:any) => {
        if(response.estado){
          this.alertaSrv.showNotification(response.mensaje)
          this.obtenerTrabajadoresCronograma()
        }else{
          this.alertaSrv.cerrarAlerta()
          this.alertaSrv.alertaErrorMsj(response.mensaje)
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
