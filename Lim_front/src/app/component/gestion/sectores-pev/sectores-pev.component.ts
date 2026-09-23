import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { SectorService } from 'src/app/services/sector-pev/sector.service';

@Component({
  selector: 'app-sectores-pev',
  templateUrl: './sectores-pev.component.html',
  styleUrls: ['./sectores-pev.component.css']
})
export class SectoresPevComponent implements OnInit {

  activo:Boolean = true;
  sectores;
  id_cliente;
  constructor(
    private _sectorPevService: SectorService, private _alertaSrv:AlertasService,
    private route:ActivatedRoute
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
    this.consultarSectores()
  }

  cargarSectores(valor){
    if (valor) {
      this.consultarSectores();
    }
  }

  consultarSectores(){
    this._alertaSrv.loading()
    this._sectorPevService.obtenerSectoresPorCliente(this.id_cliente).subscribe(
      (response:any)=>{
        this._alertaSrv.cerrarAlerta()
        this.sectores = response.sectores;
      },
      error => {
        console.log(error)
        // this._alertaSrv.cerrarAlerta()
        this._alertaSrv.alertaError();
      }
    )
  }

}
