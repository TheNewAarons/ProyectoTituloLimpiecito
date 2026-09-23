import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReservaService } from 'src/app/services/reserva/reserva.service';

@Component({
  selector: 'app-reserva-aprobado',
  templateUrl: './reserva-aprobado.component.html',
  styleUrls: ['./reserva-aprobado.component.css']
})
export class ReservaAprobadoComponent implements OnInit {
  public reservas = [];
  public loading = true;
  public page = 1;
  public pageSize = 10;
  public idCategoria;
  public nombre;

  constructor(private reservaService: ReservaService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.obtenerId();
  }
  //OBTENER ID CATE
  obtenerId() {
    this.idCategoria = this.route.snapshot.paramMap.get('idCateServicio');
    this.nombre = this.route.snapshot.paramMap.get('nombre');
    this.obtenerReservas(this.idCategoria);
  }
  //OBTENER RESERVAS
  obtenerReservas(id) {
    this.reservaService.obtenerReservaAprobada(id).subscribe(
      (response: any) => {
        this.reservas = response.reservas;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
