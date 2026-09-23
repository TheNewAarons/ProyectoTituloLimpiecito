import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog-sector-editar-nombre',
  templateUrl: './dialog-sector-editar-nombre.component.html',
  styleUrls: ['./dialog-sector-editar-nombre.component.css']
})
export class DialogSectorEditarNombreComponent implements OnInit {
  sectorForm:FormGroup

  constructor(
    public dialogRef:MatDialogRef<DialogSectorEditarNombreComponent>,@Inject(MAT_DIALOG_DATA) public data:any,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.iniciarSectorForm()
  }

  //Iniciar Sector Form
  iniciarSectorForm(){
    this.sectorForm = this.fb.group({
      nombre: [this.data.sector.nombre, [Validators.required,Validators.maxLength(80)]]
    })
  }

  //para errores
  get form(){return this.sectorForm.controls}

  editar(){
    let nombre = this.sectorForm.get('nombre').value
    let id_sector = this.data.sector.id
    let clienteId = this.data.sector.clienteId
    let estado = this.data.sector.estado
    this.dialogRef.close({nombre, clienteId,estado,id_sector});
  }

}
