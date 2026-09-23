import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Horario } from 'src/app/model/horario';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { HorarioService } from 'src/app/services/horario/horario.service';

import swal from 'sweetalert2';

@Component({
  selector: 'app-crear-horario',
  templateUrl: './crear-horario.component.html',
  styleUrls: ['./crear-horario.component.css']
})
export class CrearHorarioComponent implements OnInit {
  public idCateServicio;
  public horario: Horario;

  constructor(
    private horarioService: HorarioService, private route: ActivatedRoute,
    private router: Router, private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.horario = new Horario(null, 1, null,null);
  }

  //OBTENER ID URL
  obtenerId() {
    this.idCateServicio = this.route.snapshot.paramMap.get('idCateServicio');
  }

  //CREAR HORARIO
  crearHorario(valid) {
    if (valid) {
      this.alertaService.loading()
      this.horario.categoriaServicioId = this.idCateServicio;
      this.horarioService.crearHorario(this.horario).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.horario) {
            this.alertaService.showNotification('Horario Creado Correctamante')
            this.router.navigateByUrl('/adm_servicio/ver-cate_servicio/' + this.idCateServicio);
          } else {
            this.alertaService.alertaErrorMsj(response.mensaje)
          }
        },
        (error) => {
          this.alertaService.cerrarAlerta()
          console.log(error);
        }
      );
    }
  }
  

  
}
