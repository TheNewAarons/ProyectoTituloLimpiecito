import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccesoService } from 'src/app/services/documento/acceso/acceso.service';
import { AccesoTrabajador } from 'src/app/model/acceso_trabajador';

@Component({
  selector: 'app-crear-acceso-trabajador',
  templateUrl: './crear-acceso-trabajador.component.html',
  styleUrls: ['./crear-acceso-trabajador.component.css']
})
export class CrearAccesoTrabajadorComponent implements OnInit {
  public idTrabajador;
  public acceso: AccesoTrabajador;

  constructor(
    private route: ActivatedRoute, private accesoService: AccesoService,
    private router: Router
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.acceso = new AccesoTrabajador(null, '', '', true);
  }

  //OBTENER ID DE LA URL
  obtenerId() {
    this.idTrabajador = this.route.snapshot.paramMap.get('idTrabajador');
  }

  //CREAR ACCESO
  crearAcceso(valid) {
    if (valid) {
      this.acceso.password = btoa(this.acceso.password);
      this.accesoService.crearAccesoTrabajador(this.idTrabajador, this.acceso).subscribe(
        (response: any) => {
          if (response.acceso) {
            this.router.navigateByUrl(`/trabajador/ver/${this.idTrabajador}`);
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
