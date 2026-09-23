import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ClienteService } from 'src/app/services/cliente/cliente.service';
import { SectorService } from 'src/app/services/sector-pev/sector.service';

@Component({
  selector: 'app-form-cliente-sector-pev',
  templateUrl: './form-cliente-sector-pev.component.html',
  styleUrls: ['./form-cliente-sector-pev.component.css']
})
export class FormClienteSectorPevComponent implements OnInit {
  @Input() id_cliente;
  @Input() flag_editar;
  sectorForm: FormGroup;
  datos_sector;
  estados = [
    {value: 0, nombre: 'Inactivo'},
    {value: 1, nombre: 'Activo'}
  ];
  constructor(
    private fb: FormBuilder, private _clienteSrv: ClienteService,
    private _sectorPevService: SectorService,
    private router: Router, private _alertaSrv:AlertasService,
  ) { }

  ngOnInit() {
    this.iniciarSectorForm();
  }

  //Iniciar Sector Form
  iniciarSectorForm(){
    this.sectorForm = this.fb.group({
      nombre: [null, [Validators.required,Validators.maxLength(80)]],
      estado: [null,[Validators.required,Validators.min(0)]],
    })
  }

  //para errores
  get form(){return this.sectorForm.controls}

  registrar(){
    this._alertaSrv.loading();
    this.datos_sector = this.sectorForm.value;
    this.datos_sector.clienteId = this.id_cliente;
    this._sectorPevService.crearSector(this.datos_sector).subscribe(
      (response:any) => {
        this._alertaSrv.cerrarAlerta()
        if(response.sector){
        this._alertaSrv.showNotification('Sector:  '+response.sector.nombre+" Creado Exitosamente")
          this.router.navigate(["/gestion/sectores-pev/",this.id_cliente]);
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
