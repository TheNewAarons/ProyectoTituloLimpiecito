import { Component, OnInit } from '@angular/core';
import { CateServicioService } from 'src/app/services/categoria_servicio/cate-servicio.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CateServicio } from 'src/app/model/cateServicio';
import { HorarioService } from 'src/app/services/horario/horario.service';

@Component({
  selector: 'app-ver-cate-servicio',
  templateUrl: './ver-cate-servicio.component.html',
  styleUrls: ['./ver-cate-servicio.component.css']
})
export class VerCateServicioComponent implements OnInit {
  
  public cateServicio:CateServicio;
  public idCateServicio;
  public url_short = environment.url_short;

  constructor(
    private cateService: CateServicioService, private route: ActivatedRoute,
    private alertaService:AlertasService, private horarioService:HorarioService
  ) {}

  ngOnInit() {
    this.cateServicio = new CateServicio(null,null,null,null,null)
    this.obtenerId();
  }

  //OBTENER ID URL
  obtenerId() {
    this.idCateServicio = this.route.snapshot.paramMap.get('idCateServicio');
    this.obtenerCateServicio(this.idCateServicio);
  }

  //OBTENER CATEGORIA SERVICIO
  obtenerCateServicio(idServicio) {
    this.alertaService.loading()
    this.cateService.obtenerCateServicio(idServicio).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.cateServicio = response.cate_servicio;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //ACTIVAR DIA
  activarDia(idDia){
    this.alertaService.loading()
    this.horarioService.activarDia(idDia).subscribe(
      (response:any)=>{
        if(response.dia == 1){
          this.alertaService.showNotification('Dia Activado Correctamente')
          this.obtenerCateServicio(this.idCateServicio)
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }
  //DESACTIVAR DIA
  desactivarDia(idDia){
    this.alertaService.loading()
    this.horarioService.desactivarDia(idDia).subscribe(
      (response:any)=>{
        if(response.dia == 1){
          this.alertaService.showNotification('Dia Desactivado Correctamente')
          this.obtenerCateServicio(this.idCateServicio)
        }
      },
      error => {
        this.alertaService.cerrarAlerta()
      }
    )
  }
}
