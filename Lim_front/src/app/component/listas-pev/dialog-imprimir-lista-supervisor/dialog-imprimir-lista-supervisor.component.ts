import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import * as html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-dialog-imprimir-lista-supervisor',
  templateUrl: './dialog-imprimir-lista-supervisor.component.html',
  styleUrls: ['./dialog-imprimir-lista-supervisor.component.css']
})
export class DialogImprimirListaSupervisorComponent implements OnInit {

  constructor(
    public dialogRef:MatDialogRef<DialogImprimirListaSupervisorComponent>,@Inject(MAT_DIALOG_DATA) public data:any,
  ) { }

  ngOnInit() {
  }

  imprimir(){
    const options = {
      filename: 'ListaSupervisor.pdf',
      margin: [10, 10, 10, 10],
      html2canvas: {},
      jsPDF: { orientation: 'l', format: 'legal' }
    };
    const content: Element = document.getElementById('imprimir');
    html2pdf().from(content).set(options).save();
  }

}
