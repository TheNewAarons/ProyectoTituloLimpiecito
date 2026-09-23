import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AreaService } from 'src/app/services/area-pev/area.service';

@Component({
  selector: 'app-areas-pev',
  templateUrl: './areas-pev.component.html',
  styleUrls: ['./areas-pev.component.css']
})
export class AreasPevComponent implements OnInit {

  activo:Boolean = true;
  areas;
  id_cliente;

  constructor(
    private _areaPevSrv: AreaService, private route:ActivatedRoute,
    private _alertaSrv:AlertasService
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.consultarAreas()
  }

  cargarAreas(valor){
    if (valor) {
      this.consultarAreas();
    }
  }

  consultarAreas(){
    this._alertaSrv.loading()
    this._areaPevSrv.obtenerAreasActivasPorCliente(this.id_cliente).subscribe(
      (response:any)=>{
        this._alertaSrv.cerrarAlerta()
        this.areas = response.areas;
      },
      error => {
        console.log(error)
        // this._alertaSrv.cerrarAlerta()
        this._alertaSrv.alertaError();
      }
    )
  }
}
