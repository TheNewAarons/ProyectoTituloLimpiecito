import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
//SERVICIO
import { AsociacionService } from 'src/app/services/documento/asociacion/asociacion.service';

//MODELOS
import { TrabajadorDocumento } from '../../../../model/trabajador_documento';
import { TrabajadorService } from 'src/app/services/trabajador/trabajador.service';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-crear-asociacion',
  templateUrl: './crear-asociacion.component.html',
  styleUrls: ['./crear-asociacion.component.css']
})
export class CrearAsociacionComponent implements OnInit {
  public idDocumento;
  public trabajadores = [];
  public asoc_trabajador: TrabajadorDocumento;
  public trabajadorListo: Boolean = true;
  public asociaciones = [];
  public traAsoc;

  constructor(
    private route: ActivatedRoute,private router: Router,
    private asociacionService: AsociacionService,private trabajadorService: TrabajadorService
  ) {}

  ngOnInit() {
    this.obtenerId();
  }
  //OBTENER ID DE URL
  obtenerId() {
    this.idDocumento = this.route.snapshot.paramMap.get('idDocumento');
    this.asoc_trabajador = new TrabajadorDocumento(null, null, true, this.idDocumento, null, '');
    this.obtenerAsocTrabajadores();
  }

  //OBTENER ASOCIACIONES TRABAJADORES CON EL DOCUMENTO
  obtenerAsocTrabajadores() {
    this.asociacionService.obtenerAsocDocTraIdDocumento(this.idDocumento).subscribe(
      (response: any) => {
        this.traAsoc = response.asociaciones.map((x) => {
          return x.trabajadoreId;
        });
        this.obtenerTrabajadores();
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //OBTENER TRABAJADORES
  obtenerTrabajadores() {
    this.trabajadorService.obtenerTrabajadoresActivos().subscribe(
      (response: any) => {
        this.trabajadores = response.trabajadores.map((x) => {
          x.nombre = x.nombre + ' ' + x.apellido;
          return x;
        });
        if (this.traAsoc.length > 0) {
          this.borrarAsociados(this.traAsoc, this.trabajadores).then((x) => {
            this.trabajadores = x;
            this.trabajadorListo = false;
          });
        } else {
          this.trabajadorListo = false;
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //LIMPIAR CLIENTES O TRABAJADORES QUE YA ESTEN ASOCIADOS
  async borrarAsociados(numeroAsoc: [], newAsoc) {
    for (let index = 0; index < numeroAsoc.length; index++) {
      let numAsoc = await newAsoc.findIndex((t: any) => t.id === numeroAsoc[index]);
      if (numAsoc != -1) {
        newAsoc.splice(numAsoc, 1);
      }
    }
    return newAsoc;
  }

  //LIMPIAR
  limpiar() {
    this.asociaciones = [];
    this.asoc_trabajador = new TrabajadorDocumento(null, null, true, this.idDocumento, null, '');
  }
  //AGREGAR TRABAJADOR
  agregarTrabajador(trabajador) {
    if (trabajador) {
      let index = this.asociaciones.findIndex((asoc) => asoc.trabajadoreId === trabajador.id);
      if (index === -1) {
        this.asoc_trabajador.fecha = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
        this.asoc_trabajador.trabajadoreId = trabajador.id;
        this.asoc_trabajador.nombre = trabajador.nombre;
        this.asociaciones.push(this.asoc_trabajador);
        this.asoc_trabajador = new TrabajadorDocumento(null, null, true, this.idDocumento, null, '');
      } else {
        alert('se repite');
      }
    }
  }
  //QUITAR ASOCIACION
  quitarAsoc(asoc) {
    let index = this.asociaciones.findIndex((x) => x === asoc);
    if (index != -1) {
      this.asociaciones.splice(index, 1);
    }
  }

  //CREAR ASOCIACION DE TRABAJADOR
  asociarTrabajador(valid) {
    if (valid) {
      this.asociacionService.crearDocTra(this.asociaciones).subscribe(
        (response: any) => {
          if (response.resultado.length > 0) {
            this.router.navigateByUrl('/archivo/documentos');
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
