import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as html2pdf from 'html2pdf.js';

import { RecepcionBodegaService } from '../../../services/recepcion-bodega/recepcion-bodega.service';
import { AlertasService } from '../../../services/alertas/alertas.service';
import { LoginService } from '../../../services/login/login.service';
import { FormatoEntrega } from '../../../model/recepcion-bodega';
import { mostrarErrorBodega } from '../../solicitudes-bodega/solicitudes-bodega.errores';

// RF-BOD-04: formato de entrega imprimible (mismo mecanismo html2pdf que pdf-lista-insumo)
@Component({
  selector: 'app-formato-entrega',
  templateUrl: './formato-entrega.component.html',
  styleUrls: ['../../solicitudes-bodega/solicitudes-bodega.css']
})
export class FormatoEntregaComponent implements OnInit {
  formato: FormatoEntrega = null;
  idSolicitud: number;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recepcionService: RecepcionBodegaService,
    private alertas: AlertasService,
    private loginService: LoginService
  ) {}

  ngOnInit() {
    this.idSolicitud = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.recepcionService.formatoEntrega(this.idSolicitud).subscribe(
      (r) => {
        this.formato = r.data;
        this.loading = false;
      },
      (error: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorBodega(error, this.alertas, this.loginService);
      }
    );
  }

  //EXPORTAR PDF
  imprimir() {
    const options = {
      filename: 'Entrega_solicitud_' + this.idSolicitud + '.pdf',
      margin: [10, 10, 10, 10],
      html2canvas: {},
      jsPDF: { orientation: 'portrait', format: 'letter' }
    };
    const content: Element = document.getElementById('imprimir-entrega');
    html2pdf().from(content).set(options).save();
  }

  volver() {
    this.router.navigate(['/bodega/solicitudes', this.idSolicitud]);
  }
}
