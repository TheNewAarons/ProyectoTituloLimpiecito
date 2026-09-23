import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Bloque } from 'src/app/model/bloque';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { BloqueService } from 'src/app/services/bloque/bloque.service';
import { HorarioService } from 'src/app/services/horario/horario.service';
@Component({
  selector: 'app-generar-bloque',
  templateUrl: './generar-bloque.component.html',
  styleUrls: ['./generar-bloque.component.css']
})
export class GenerarBloqueComponent implements OnInit {

  public dia
  public idDia
  public idCate 
  public horario
  public bloque: Bloque
  public bloques: Bloque[] = [];
  public hora_inicio
  public hora_fin

  constructor(
    private route:ActivatedRoute, private horarioService:HorarioService,
    private bloqueService:BloqueService, private alertaService:AlertasService  
  ) { }

  ngOnInit() {
    this.obtenerId()
    this.bloque = new Bloque(null, null, null,true, null);
  }

  obtenerId(){
    this.idDia = this.route.snapshot.paramMap.get('idDia');
    this.idCate = this.route.snapshot.paramMap.get('idCate');
    this.obtenerDia()
  }

  obtenerDia(){
    this.alertaService.loading()
    this.horarioService.obtenerDia(this.idDia).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        this.dia = response.dia
      },
      error =>{
        this.alertaService.cerrarAlerta()
      }
    )
  }

  crearBloques(){
    this.alertaService.loading()
    this.agregarBloque()
    this.bloqueService.crearBloque(this.bloques).subscribe(
      (response:any)=>{
        if(response.resultado > 0){
          this.bloque = new Bloque(null, null, null,true, null);
          this.bloques = []
          this.alertaService.showNotification('Bloques Generado Correctamante')
          this.obtenerDia()
        }else{
          this.alertaService.alertaError()
          this.alertaService.cerrarAlerta()
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        console.log(error)
      }
    )
  }
  agregarBloque(){
    this.bloque.hora_inicio = this.hora_inicio
    this.bloque.hora_fin = this.hora_fin
    this.bloque.diaId = this.idDia
    this.bloques.push(this.bloque)
  }
  //ACTIVAR BLOQUE
  activarBloque(idBloque){
    this.bloqueService.activarBloque(idBloque).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        if(response.filas > 0){
          this.alertaService.showNotification('Bloque Activado Correctamente')
          this.obtenerDia()
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
      }
    )
  }
  //DESACTIVAR BLOQUE
  desactivarBloque(idBloque){
    this.alertaService.loading()
    this.bloqueService.desactivarBloque(idBloque).subscribe(
      (response:any)=>{
        this.alertaService.cerrarAlerta()
        if(response.filas > 0){
          this.alertaService.showNotification('Bloque Desactivado Correctamente')
          this.obtenerDia()
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
        this.alertaService.alertaError()
      }
    )
  }
}
