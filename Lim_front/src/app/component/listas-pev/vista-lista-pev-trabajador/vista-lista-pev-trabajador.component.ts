import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { ListasPevService } from 'src/app/services/listas-pev/listas-pev.service';
import swal from 'sweetalert2';
import { DialogImprimirListaCheckComponent } from '../dialog-imprimir-lista-check/dialog-imprimir-lista-check.component';

@Component({
  selector: 'app-vista-lista-pev-trabajador',
  templateUrl: './vista-lista-pev-trabajador.component.html',
  styleUrls: ['./vista-lista-pev-trabajador.component.css']
})
export class VistaListaPevTrabajadorComponent implements OnInit {
  id_lista_pev;
  listasPevConLineasPev;
  listaPev_vista = [];
  sector_selector = [];
  trabajador;
  nombre_cliente: string;
  turno: string;
  estado_cronograma;

  constructor(
    private route: ActivatedRoute,
    private _location: Location,
    private _listasPevSrv: ListasPevService,
    private _alertaSrv: AlertasService,
    public dialog: MatDialog
  ) {}

  ngOnInit() {
    this.id_lista_pev = this.route.snapshot.paramMap.get('id_lista_pev');
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre');
    this.turno = this.route.snapshot.paramMap.get('turno');
    this.obtenerListaPevCOnlineasPev();
  }
  volverAtras() {
    this._location.back();
  }
  obtenerListaPevCOnlineasPev() {
    this._alertaSrv.loading();
    this._listasPevSrv.obtenerListaPevConLineas(this.id_lista_pev).subscribe(
      (response: any) => {
        this._alertaSrv.cerrarAlerta();
        this.listasPevConLineasPev = response.lista_pev_trabajador;
        this.estado_cronograma = response.cronograma.estado;
        this.obtenerTrabajador();
        this.generarNuevaVersion();
      },
      (error) => {
        this._alertaSrv.loading();
        this._alertaSrv.alertaErrorMsj('Ha ocurrido un error: ' + error);
      }
    );
  }

  obtenerTrabajador() {
    this._listasPevSrv.obtenerTrabajadorNumeroEmpleado(this.listasPevConLineasPev.n_empleado).subscribe((response: any) => {
      this.trabajador = response.trabajador;
    });
  }

  generarNuevaVersion() {
    this.listaPev_vista = [];
    let sector_repes = [];
    let area_repes = [];
    this.listasPevConLineasPev.linea_lista_pev_trabajadores.forEach((element) => {
      let vista_aux = {
        id_lista_pev_trabajador: element.id,
        check_trabajador_1: element.check_trabajador_1,
        hora_check_trabajador_1: element.hora_check_trabajador_1,
        check_trabajador_2: element.check_trabajador_2,
        hora_check_trabajador_2: element.hora_check_trabajador_2,
        check_trabajador_3: element.check_trabajador_3,
        hora_check_trabajador_3: element.hora_check_trabajador_3,
        observaciones: element.observaciones,
        n_sector: element.tarea.area.sectore.nombre,
        s_rows: 0,
        id_area: element.tarea.areaId,
        n_area: element.tarea.area.nombre,
        a_rows: 0,
        id_tarea: element.tareaId,
        n_tarea: element.tarea.nombre
      };
      this.listaPev_vista.push(vista_aux);
    });

    this.listaPev_vista.forEach((ele) => {
      let index_sector = sector_repes.findIndex((x: any) => x.id_sector == ele.id_sector);
      if (index_sector == -1) {
        let repe = { id_sector: ele.id_sector, s_rows: 1 };
        sector_repes.push(repe);
        let sec_tor = { id_sector: ele.id_sector, nombre: ele.n_sector };
        this.sector_selector.push(sec_tor);
      } else {
        sector_repes[index_sector].s_rows++;
      }
      let index_area = area_repes.findIndex((x: any) => x.id_area == ele.id_area);
      if (index_area == -1) {
        let repe = { id_area: ele.id_area, a_rows: 1 };
        area_repes.push(repe);
      } else {
        area_repes[index_area].a_rows++;
      }
    });

    //* Colocar las lineas repetidas en su respectiva linea
    this.listaPev_vista.forEach((x) => {
      let index = sector_repes.findIndex((y) => y.id_sector == x.id_sector);
      if (index != -1) {
        x.s_rows = sector_repes[index].s_rows;
        sector_repes.splice(index, 1);
      }
      let index_area = area_repes.findIndex((c) => c.id_area == x.id_area);
      if (index_area != -1) {
        x.a_rows = area_repes[index_area].a_rows;
        area_repes.splice(index_area, 1);
      }
    });
  }

  marcarCheck1(index) {
    this._alertaSrv.loading();
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false, // false
      hour: 'numeric', // 2-digit
      minute: '2-digit', // numeric
      second: '2-digit' // numeric
    });
    if (this.listaPev_vista[index].check_trabajador_1 == 0) {
      this.listaPev_vista[index].check_trabajador_1 = 1;
    } else {
      this.listaPev_vista[index].check_trabajador_1 = 0;
    }
    this.listaPev_vista[index].hora_check_trabajador_1 = now;
    let linea_lista_pev = {
      check_trabajador_1: this.listaPev_vista[index].check_trabajador_1,
      hora_check_trabajador_1: this.listaPev_vista[index].hora_check_trabajador_1
    };
    this._listasPevSrv.actualizarLineaListaPev(this.listaPev_vista[index].id_lista_pev_trabajador, linea_lista_pev).subscribe(
      (response: any) => {
        this._alertaSrv.cerrarAlerta();
        if (response.estado) {
          this._alertaSrv.showNotification(response.mensaje);
        } else {
          this._alertaSrv.showNotification(response.mensaje);
        }
      },
      (error) => {
        this._alertaSrv.cerrarAlerta();
        this._alertaSrv.alertaErrorMsj('Ha ocurrido un error' + error);
      }
    );
  }
  marcarCheck2(index) {
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false, // false
      hour: 'numeric', // 2-digit
      minute: '2-digit', // numeric
      second: '2-digit' // numeric
    });
    if (this.listaPev_vista[index].check_trabajador_2 == 0) {
      this.listaPev_vista[index].check_trabajador_2 = 1;
    } else {
      this.listaPev_vista[index].check_trabajador_2 = 0;
    }
    this.listaPev_vista[index].hora_check_trabajador_2 = now;
    let linea_lista_pev = {
      check_trabajador_2: this.listaPev_vista[index].check_trabajador_2,
      hora_check_trabajador_2: this.listaPev_vista[index].hora_check_trabajador_2
    };
    this._listasPevSrv.actualizarLineaListaPev(this.listaPev_vista[index].id_lista_pev_trabajador, linea_lista_pev).subscribe(
      (response: any) => {
        this._alertaSrv.cerrarAlerta();
        if (response.estado) {
          this._alertaSrv.showNotification(response.mensaje);
        } else {
          this._alertaSrv.showNotification(response.mensaje);
        }
      },
      (error) => {
        this._alertaSrv.cerrarAlerta();
        this._alertaSrv.alertaErrorMsj('Ha ocurrido un error' + error);
      }
    );
  }
  marcarCheck3(index) {
    let today = new Date();
    let now = today.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false, // false
      hour: 'numeric', // 2-digit
      minute: '2-digit', // numeric
      second: '2-digit' // numeric
    });
    if (this.listaPev_vista[index].check_trabajador_3 == 0) {
      this.listaPev_vista[index].check_trabajador_3 = 1;
    } else {
      this.listaPev_vista[index].check_trabajador_3 = 0;
    }
    this.listaPev_vista[index].hora_check_trabajador_3 = now;
    let linea_lista_pev = {
      check_trabajador_3: this.listaPev_vista[index].check_trabajador_3,
      hora_check_trabajador_3: this.listaPev_vista[index].hora_check_trabajador_3
    };
    this._listasPevSrv.actualizarLineaListaPev(this.listaPev_vista[index].id_lista_pev_trabajador, linea_lista_pev).subscribe(
      (response: any) => {
        this._alertaSrv.cerrarAlerta();
        if (response.estado) {
          this._alertaSrv.showNotification(response.mensaje);
        } else {
          this._alertaSrv.showNotification(response.mensaje);
        }
      },
      (error) => {
        this._alertaSrv.cerrarAlerta();
        this._alertaSrv.alertaErrorMsj('Ha ocurrido un error' + error);
      }
    );
  }
  actualizarObservaciones(index) {
    let linea_lista_pev = {
      observaciones: this.listaPev_vista[index].observaciones
    };
    this._listasPevSrv.actualizarLineaListaPev(this.listaPev_vista[index].id_lista_pev_trabajador, linea_lista_pev).subscribe(
      (response: any) => {
        this._alertaSrv.cerrarAlerta();
        if (response.estado) {
          this._alertaSrv.showNotification(response.mensaje);
        } else {
          this._alertaSrv.showNotification(response.mensaje);
        }
      },
      (error) => {
        this._alertaSrv.cerrarAlerta();
        this._alertaSrv.alertaErrorMsj('Ha ocurrido un error' + error);
      }
    );
  }

  cambiarEstadoListaPev() {
    let today = new Date();
    let lista_pev = {
      estado: 2,
      fecha_firma: today.toISOString()
    };
    swal
      .fire({
        title: '¿Estas seguro?',
        text: 'Vas a finalizar y firmar esta Lista PEV. Ya no podras modificarla',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'btn btn-success',
        cancelButtonColor: 'btn btn-danger',
        confirmButtonText: 'Si, !Finalizar y Firmar¡',
        cancelButtonText: 'Cancelar'
      })
      .then((result) => {
        if (result.value) {
          this._listasPevSrv.cambiarEstadoListaPev(this.listasPevConLineasPev.id, lista_pev).subscribe(
            (response: any) => {
              this._alertaSrv.cerrarAlerta();
              if (response.estado) {
                this._alertaSrv.showNotification(response.mensaje);
              } else {
                this._alertaSrv.showNotification(response.mensaje);
              }
              this.obtenerListaPevCOnlineasPev();
            },
            (error) => {
              this._alertaSrv.cerrarAlerta();
              this._alertaSrv.alertaErrorMsj('Ha ocurrido un error' + error);
            }
          );
        }
      });
  }

  abrirVistaImpresion() {
    const dialogRef = this.dialog.open(DialogImprimirListaCheckComponent, {
      width: 'auto',
      // height:'800px',
      data: {  nombre_cliente:this.nombre_cliente, trabajador:this.trabajador, listasPevConLineasPev:this.listasPevConLineasPev , listaPev_vista: this.listaPev_vista, turno:this.turno}
    });

    dialogRef.afterClosed().subscribe(() => {
    });
  }
}
