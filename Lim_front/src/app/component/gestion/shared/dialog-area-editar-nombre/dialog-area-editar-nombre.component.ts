import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog-area-editar-nombre',
  templateUrl: './dialog-area-editar-nombre.component.html',
  styleUrls: ['./dialog-area-editar-nombre.component.css']
})
export class DialogAreaEditarNombreComponent implements OnInit {

  areaForm:FormGroup

  constructor(
    public dialogRef:MatDialogRef<DialogAreaEditarNombreComponent>,@Inject(MAT_DIALOG_DATA) public data:any,
    private fb:FormBuilder
  ) { }

  ngOnInit() {
    this.iniciarAreaForm()
  }

  iniciarAreaForm(){
    this.areaForm = this.fb.group({
      nombre: [this.data.area.nombre, [Validators.required,Validators.maxLength(100)]],
    })
  }
  //para errores
  get form(){return this.areaForm.controls}

  editar(){
    let nombre = this.areaForm.get('nombre').value
    let id_area = this.data.area.id
    let sectoreId = this.data.area.sectoreId
    let estado = this.data.area.estado
    this.dialogRef.close({nombre, sectoreId,estado,id_area});
  }

}
