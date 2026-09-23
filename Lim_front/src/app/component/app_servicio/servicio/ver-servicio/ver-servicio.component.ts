import { Component, OnInit } from '@angular/core';
import { ServicioService } from 'src/app/services/servicio/servicio.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ver-servicio',
  templateUrl: './ver-servicio.component.html',
  styleUrls: ['./ver-servicio.component.css']
})
export class VerServicioComponent implements OnInit {
  public servicioId;
  public servicio;
  public url_short = environment.url_short;
  public loading = true;

  constructor(
    private servicioService: ServicioService, private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.obtenerId();
  }

  //OBTENER ID
  obtenerId() {
    this.servicioId = this.route.snapshot.paramMap.get('idServicio');
    this.obtenerServicio(this.servicioId);
  }
  //OBTENER SERVICIO POR ID
  obtenerServicio(id) {
    this.servicioService.obtenerServicio(id).subscribe(
      (response: any) => {
        this.servicio = response.servicio;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
