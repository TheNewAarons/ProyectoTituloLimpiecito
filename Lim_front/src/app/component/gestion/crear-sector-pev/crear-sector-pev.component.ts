import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-crear-sector-pev',
  templateUrl: './crear-sector-pev.component.html',
  styleUrls: ['./crear-sector-pev.component.css']
})
export class CrearSectorPevComponent implements OnInit {
  id_cliente;
  flag_editar = false;
  constructor(
    private route:ActivatedRoute,
    //private clienteService: ClienteService,
    private _location: Location,
  ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
  }
  volverAtras(){
    this._location.back();
  }
}
