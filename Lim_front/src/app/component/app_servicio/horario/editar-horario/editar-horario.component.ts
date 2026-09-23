import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Horario } from 'src/app/model/horario';
import { AlertasService } from 'src/app/services/alertas/alertas.service';
import { BloqueService } from 'src/app/services/bloque/bloque.service';
import { HorarioService } from 'src/app/services/horario/horario.service';

@Component({
  selector: 'app-editar-horario',
  templateUrl: './editar-horario.component.html',
  styleUrls: ['./editar-horario.component.css']
})
export class EditarHorarioComponent implements OnInit {
  public idHorario;
  public horario:Horario;

  constructor(
    private route: ActivatedRoute, private router: Router,
    private horarioService: HorarioService, private bloqueService:BloqueService,
    private alertaService:AlertasService
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.horario = new Horario(null,null,null,null)
  }

  //OBTENER ID URL
  obtenerId() {
    this.idHorario = this.route.snapshot.paramMap.get('idHorario');
    this.obtenerHorario(this.idHorario);
  }
  //OBTENER HORARIO
  obtenerHorario(idHorario) {
    this.alertaService.loading()
    this.horarioService.obtenerHorarioSolo(idHorario).subscribe(
      (response: any) => {
        this.alertaService.cerrarAlerta()
        this.horario = response.horario;
      },
      (error) => {
        this.alertaService.cerrarAlerta()
        console.log(error);
      }
    );
  }
  //EDITAR HORARIO
  editarHorario(valid) {
    if (valid) {
      this.alertaService.loading()
      this.horarioService.editarHorario(this.horario.id, this.horario).subscribe(
        (response: any) => {
          this.alertaService.cerrarAlerta()
          if (response.filas > 0) {
            this.alertaService.showNotification('Horario Editado Correctamante')
            this.router.navigate(['/adm_servicio/editar-cate_servicio/', this.horario.categoriaServicioId])
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
