import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog-tarea-editar-nombre',
  templateUrl: './dialog-tarea-editar-nombre.component.html',
  styleUrls: ['./dialog-tarea-editar-nombre.component.css']
})
export class DialogTareaEditarNombreComponent implements OnInit {

  tareaForm:FormGroup

  constructor(
    public dialogRef:MatDialogRef<DialogTareaEditarNombreComponent>,@Inject(MAT_DIALOG_DATA) public data:any,
    private fb:FormBuilder
  ) { }

  ngOnInit() {
    this.iniciarAreaForm()
  }

  iniciarAreaForm(){
    this.tareaForm = this.fb.group({
      nombre: [this.data.tarea.nombre, [Validators.required,Validators.maxLength(100)]],
    })
  }
  //para errores
  get form(){return this.tareaForm.controls}

  editar(){
    let nombre = this.tareaForm.get('nombre').value
    let id_tarea = this.data.tarea.id
    let areaId = this.data.tarea.areaId
    let estado = this.data.tarea.estado
    this.dialogRef.close({nombre, areaId,estado,id_tarea});
  }

}
