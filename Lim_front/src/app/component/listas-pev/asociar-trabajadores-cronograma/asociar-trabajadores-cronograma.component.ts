import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';

@Component({
  selector: 'app-asociar-trabajadores-cronograma',
  templateUrl: './asociar-trabajadores-cronograma.component.html',
  styleUrls: ['./asociar-trabajadores-cronograma.component.css']
})
export class AsociarTrabajadoresCronogramaComponent implements OnInit {
  id_cliente;
  id_cronograma;
  trabajadores = [];
  trabajador_asociado = []
  constructor(
    public route: ActivatedRoute, private alertaSrv:AlertasService, private _location: Location,
    private _listaPevSrv: ListasPevService
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.id_cronograma = this.route.snapshot.paramMap.get('id_cronograma')
    this.obtenerTrabajadoresNoAsociadosCronograma()

  }
  volverAtras(){
    this._location.back();
  }
  obtenerTrabajadoresNoAsociadosCronograma(){
    this.alertaSrv.loading()
      this._listaPevSrv.obtenerTrabajadoresNoAsociadosCronograma(this.id_cliente,this.id_cronograma).subscribe(
        (response:any) => {
          this.alertaSrv.cerrarAlerta()
          this.prepararTrabajadores(response.trabajadores_centro_costo,response.trabajadores_cronograma)
        }, error =>{
          this.alertaSrv.cerrarAlerta()
          console.log(error)
        }
      )
  }
  prepararTrabajadores(trabajadores_centro,trabajadores_cronograma){
    this.trabajadores = []
    trabajadores_centro.forEach(element => {
      let existe = trabajadores_cronograma.find(x => x.trabajadoreId == element.trabajadoreId)
      if(!existe){
        let trabajador_aux = {
          trabajadoreId:element.trabajadoreId,
          nombre:element.trabajadore.nombre,
          apellido:element.trabajadore.apellido,
          rut:element.trabajadore.rut,
          check:0
        }
        this.trabajadores.push(trabajador_aux)
      }
    });
  }
  marcarAsociarTrabajadorCronograma(index){
    if(this.trabajadores[index].check == 0){
      this.trabajadores[index].check = 1
      let trabajador = {
        trabajadoreId:this.trabajadores[index].trabajadoreId
      }
      this.trabajador_asociado.push(trabajador)
    }else{
      this.trabajadores[index].check = 0
      let elementoIndex = this.trabajador_asociado.findIndex(element => element.trabajadoreId == this.trabajadores[index].trabajadoreId);
      if(elementoIndex != -1){
        this.trabajador_asociado.splice(elementoIndex,1)
      }else{
        this.alertaSrv.alertaErrorMsj("No existe el elemento o ya se elimino")
      }
    }
  }
  asociarTrabajadoresCronograma(){
    this._listaPevSrv.AsociarTrabajadoresCronograma(this.id_cronograma,this.trabajador_asociado).subscribe(
      (response:any) => {
        this.alertaSrv.showNotification(response.mensaje)
        this.obtenerTrabajadoresNoAsociadosCronograma()
      },error => {
        this.alertaSrv.alertaErrorMsj("Ha ocurrido un error: "+error)
      }
    )
  }
}
