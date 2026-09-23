import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { CronogramaService } from 'src/app/services/cronograma/cronograma.service';

import swal from 'sweetalert2';
@Component({
  selector: 'app-ver-cronogramas',
  templateUrl: './ver-cronogramas.component.html',
  styleUrls: ['./ver-cronogramas.component.css']
})
export class VerCronogramasComponent implements OnInit {

  id_cliente
  cronogramas_activos = []
  cronogramas_inactivos = []
  nombre_cliente = ''
  meses = [
    { valor: 0, nombre: 'Enero' },{ valor: 1, nombre: 'Febrero' },{ valor: 2, nombre: 'Marzo' },
    { valor: 3, nombre: 'Abril' },{ valor: 4, nombre: 'Mayo' },{ valor: 5, nombre: 'Junio' },
    { valor: 6, nombre: 'Julio' },{ valor: 7, nombre: 'Agosto' },{ valor: 8, nombre: 'Septiembre' },
    { valor: 9, nombre: 'Octubre' },{ valor: 10, nombre: 'Noviembre' },{ valor: 11, nombre: 'Diciembre' }
  ];
  anios = []

  mes_busqueda = null
  anio_busqueda = null

  constructor(
    private route:ActivatedRoute, private cronogramaSrv:CronogramaService,
    private alertaSrv:AlertasService, private router:Router
    ) { }

  ngOnInit() {
    this.id_cliente = this.route.snapshot.paramMap.get('id_cliente')
    this.nombre_cliente = this.route.snapshot.paramMap.get('nombre')
    this.generarAnios()
    this.obtenerCronogramas()
  }

  generarAnios() {
    const max = new Date().getFullYear()
    const min = 2022
    for (let i = max; i >= min; i--) {
        this.anios.push(i)
    }
  }

  obtenerCronogramas(){
    this.alertaSrv.loading()
    let cronograma_activo = this.cronogramaSrv.obtenerCronogramasActivos(this.id_cliente)
    let cronograma_inactivo = this.cronogramaSrv.obtenerCronogramasInactivos(this.id_cliente)
    forkJoin([cronograma_activo,cronograma_inactivo]).subscribe(
      (response:any) => {
        this.alertaSrv.cerrarAlerta()
        this.cronogramas_activos = response[0].cronogramas
        this.cronogramas_inactivos = response[1].cronogramas
      },
      error => {
        this.alertaSrv.cerrarAlerta()
        console.log(error)
      }
    )
  }

  verCronograma(id){
    this.router.navigate(['/cronograma/ver-cronograma',this.id_cliente,id])
  }

  buscarCronogramas(){
    if( this.mes_busqueda != null && this.anio_busqueda != null){
      this.alertaSrv.loading()
      let cronogramas_busqueda_activos = this.cronogramaSrv.obtenerCronogramaActivosMesAnio(this.id_cliente,this.mes_busqueda,this.anio_busqueda)
      let cronogramas_busqueda_inactivos = this.cronogramaSrv.obtenerCronogramaInactivosMesAnio(this.id_cliente,this.mes_busqueda,this.anio_busqueda)
      forkJoin([cronogramas_busqueda_activos,cronogramas_busqueda_inactivos]).subscribe(
        (response:any) => {
          this.alertaSrv.cerrarAlerta()
          this.cronogramas_activos = response[0].cronogramas
          this.cronogramas_inactivos = response[1].cronogramas
        },
        error => {
          this.alertaSrv.alertaError()
        }
      )
    }else{
      this.alertaSrv.showNotification('Seleccione mes y año para la búsqueda')
    }
  }

  eliminarCronograma(id){
    swal.fire({
      title: '¿Estas seguro de eliminar este cronograma?',
      text: 'Estas por eliminar este cronograma con todos sus datos asociados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.alertaSrv.loading()
        this.cronogramaSrv.eliminarCronograma(id).subscribe(
          (response: any) => {
            if(response.res_eliminar_cronograma === 1){
              this.alertaSrv.showNotification('Cronograma Eliminado correctamente')
              this.obtenerCronogramas()
            }else{
              this.alertaSrv.alertaError()
            }
          },
          (error) => {
            this.alertaSrv.alertaError()
            console.log(error);
          }
        );
      }
    });
  }

}
