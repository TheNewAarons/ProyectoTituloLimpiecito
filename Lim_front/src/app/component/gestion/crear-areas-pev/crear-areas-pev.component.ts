import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-crear-areas-pev',
  templateUrl: './crear-areas-pev.component.html',
  styleUrls: ['./crear-areas-pev.component.css']
})
export class CrearAreasPevComponent implements OnInit {

  id_sector;
  flag_editar = false;
  id_cliente;
  constructor(
    private route:ActivatedRoute,
    private _location: Location,
  ) { }

  ngOnInit() {
    this.id_sector = this.route.snapshot.paramMap.get('id_sector');
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente');
  }
  volverAtras(){
    this._location.back();    
  }
}
