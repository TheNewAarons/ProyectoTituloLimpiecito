import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { AreaService } from 'src/app/services/area-pev/area.service';
import { SectorService } from 'src/app/services/sector-pev/sector.service';

@Component({
  selector: 'app-form-area-pev',
  templateUrl: './form-area-pev.component.html',
  styleUrls: ['./form-area-pev.component.css']
})
export class FormAreaPevComponent implements OnInit {
  @Input() id_sector;
  @Input() id_cliente;
  @Input() flag_editar;
  id_sector_seleccionado;
  areaForm: FormGroup;
  datos_area;
  sectores;
  activo = false;
  estados = [
    {value: 0, nombre: 'Inactivo'},
    {value: 1, nombre: 'Activo'}
  ];
  constructor(
    private fb: FormBuilder, private _areaPevSrv:AreaService, private _sectorPevSrv:SectorService,
    private router: Router, private _alertaSrv:AlertasService,
  ) { }

  ngOnInit() {
    this.iniciarAreaForm();
    this.obtenerSectoresActivos();
  }
  //Iniciar Area Form

  obtenerSectoresActivos(){
    this._alertaSrv.loading();
    this._sectorPevSrv.obtenerSectoresActivoPorCliente(this.id_cliente).subscribe(
      (response:any) => {
        this.sectores = response.sectores;
        this.activo = true;
        this._alertaSrv.cerrarAlerta()
      },error => {
        console.log(error)
      }
    )
  }

  iniciarAreaForm(){
    this.areaForm = this.fb.group({
      nombre: [null, [Validators.required,Validators.maxLength(100)]],
      estado: [null,[Validators.required,Validators.min(0)]],
    })
  }
  //para errores
  get form(){return this.areaForm.controls}
  registrar(){
    this._alertaSrv.loading();
    this.datos_area = this.areaForm.value;
    this.datos_area.sectoreId = this.id_sector;
    this._areaPevSrv.crearArea(this.datos_area).subscribe(
      (response:any) => {
        this._alertaSrv.cerrarAlerta()
        if(response.area){
          this._alertaSrv.showNotification('Area '+response.area.nombre+" Creada Exitosamente")
          this.router.navigate(["/gestion/areas-pev/",this.id_cliente]);
        }
      },
      error => {
        this._alertaSrv.cerrarAlerta()
        this._alertaSrv.alertaErrorMsj("Ha ocurrido un problema")
        console.log(error)
      }
    )
  }

}
