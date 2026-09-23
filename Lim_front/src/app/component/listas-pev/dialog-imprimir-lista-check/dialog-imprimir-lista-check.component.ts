import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import * as html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-dialog-imprimir-lista-check',
  templateUrl: './dialog-imprimir-lista-check.component.html',
  styleUrls: ['./dialog-imprimir-lista-check.component.css']
})
export class DialogImprimirListaCheckComponent implements OnInit {

  constructor(
    public dialogRef:MatDialogRef<DialogImprimirListaCheckComponent>,@Inject(MAT_DIALOG_DATA) public data:any,
  ) { }

  ngOnInit() {
  }

  imprimir(){
    const options = {
      filename: 'ListaCheckeo.pdf',
      margin: [10, 10, 10, 10],
      html2canvas: {},
      jsPDF: { orientation: 'l', format: 'legal' }
    };
    const content: Element = document.getElementById('imprimir');
    html2pdf().from(content).set(options).save();
  }

}
