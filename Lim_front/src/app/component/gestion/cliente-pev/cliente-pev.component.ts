import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ClienteService } from 'src/app/services/cliente/cliente.service';
import { TurnoService } from 'src/app/services/turno-pev/turno.service';

@Component({
  selector: 'app-cliente-pev',
  templateUrl: './cliente-pev.component.html',
  styleUrls: ['./cliente-pev.component.css']
})

export class ClientePevComponent implements OnInit {
  id_cliente;
  cliente;
  turnos;
  turno = {
    clienteId:''
  }
  turno_estado = {
    estado:''
  }
  constructor(
    private route:ActivatedRoute, private router:Router,
    private clienteService: ClienteService, private _turnoPevSrv: TurnoService,
    private _location: Location, private _alertaSrv:AlertasService,
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.obtenerCliente()
    this.turno.clienteId = ''
    this.turno_estado.estado = null
    this.obtenerTurnos()
  }

  volverAtras(){
    this.router.navigate(['/gestion/clientes'])
  }

  obtenerCliente(){
    this._alertaSrv.loading()
    this.clienteService.obtenerClientePorId(this.id_cliente).subscribe(
      (response:any) =>{
        this.cliente = response.cliente;
        this._alertaSrv.cerrarAlerta()
      },
      error => {
        console.log(error);
        this._alertaSrv.showNotification("Error")
        this._alertaSrv.cerrarAlerta()
      }
    )
  }
  generarTurnos(){
    this.turno.clienteId = this.id_cliente;
    console.log(this.turno.clienteId)
    this._turnoPevSrv.crearTurnos(this.turno).subscribe(
      (response:any) =>{
        if(response.turno){
          this.obtenerTurnos()
          this._alertaSrv.showNotification("Turnos A, B y C Generados Exitosamente")
        }
      },
      error => {
        console.log(error);
      }
    )
  }
  obtenerTurnos(){
    this._turnoPevSrv.obtenerTurnos(this.id_cliente).subscribe(
      (response:any) => {
        this.turnos = response.turnos
      },
      error => {
        console.log(error)
      }
    )
  }

  cambiarEstadoTurno(id,estado){
    let mensaje;
    if(estado == 0){
      estado = 1
      mensaje = "Turno actualizado a: ACTIVADO"
    }else if(estado == 1){
      estado = 0
      mensaje = "Turno actualizado a: DESACTIVADO"
    }
    this.turno_estado.estado = estado
    this._turnoPevSrv.cambiarEstadoTurno(id,this.turno_estado).subscribe(
      (response:any) => {
        this.obtenerTurnos()
        this._alertaSrv.showNotification(mensaje)
      },
      error => {
        console.log(error)
        this._alertaSrv.showNotification("Ha ocurrido un error: "+error)
      }
    )
  }

}
