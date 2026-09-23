import { Location } from '@angular/common';
import { CompileShallowModuleMetadata } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';

@Component({
  selector: 'app-lista-pev-trabajador',
  templateUrl: './lista-pev-trabajador.component.html',
  styleUrls: ['./lista-pev-trabajador.component.css']
})
export class ListaPevTrabajadorComponent implements OnInit {
  id_cronograma;
  n_empleado;
  listasPevTrabajador;
  nombre_trabajador
  apellido_trabajador
  turno:string
  nombre_cliente:string
  estado_cronograma
  constructor(
    private route:ActivatedRoute, private _location: Location,
    private _listasPevTrabajadorSrv:ListasPevService, private alertaSrv:AlertasService
  ) { }

  ngOnInit() {
    this.id_cronograma = this.route.snapshot.paramMap.get('id_cronograma')
    this.n_empleado = this.route.snapshot.paramMap.get('n_empleado')
    this.nombre_trabajador = this.route.snapshot.paramMap.get('nombre')
    this.apellido_trabajador = this.route.snapshot.paramMap.get('apellido')
    this.turno = this.route.snapshot.paramMap.get('turno')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre_cliente')
    this.obtenerListasPevTrabajador()
  }
  volverAtras(){
    this._location.back();
  }
  obtenerListasPevTrabajador(){
    this.alertaSrv.loading()
    this._listasPevTrabajadorSrv.obtenerListasPevTrabajador(this.id_cronograma,this.n_empleado).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        this.listasPevTrabajador = response.listas_pev
        this.estado_cronograma = response.cronograma.estado
      },error => {
        this.alertaSrv.cerrarAlerta()
        console.log(error)
      }
    )
  }
}
