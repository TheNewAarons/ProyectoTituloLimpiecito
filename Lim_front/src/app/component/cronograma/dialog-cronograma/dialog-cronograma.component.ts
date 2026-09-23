import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog-cronograma',
  templateUrl: './dialog-cronograma.component.html',
  styleUrls: ['./dialog-cronograma.component.css']
})
export class DialogCronogramaComponent implements OnInit {

  check = {id:null,check:null, comentario:'',fecha:null,lineaCronogramaId:null}
  estados = [{valor:true, texto:'Activo'},{valor:false, texto:'Inactivo'}]
  datos = { linea_antigua:null, linea_nueva:null}
  loader=false
  constructor(
    public dialogRef:MatDialogRef<DialogCronogramaComponent>,@Inject(MAT_DIALOG_DATA) public data:any
  ) { }

  ngOnInit() {
    this.check.id = this.data.objeto.id
    this.check.check = this.data.objeto.check
    this.check.fecha = this.data.objeto.fecha.fecha_crear
    this.check.comentario = this.data.objeto.comentario
    this.check.lineaCronogramaId = this.data.objeto.lineaCronogramaId
    this.datos.linea_antigua = this.data.objeto
    this.datos.linea_nueva = this.check
  }

  cambiarEstado(){
    this.check.check = !this.check.check
  }

}
