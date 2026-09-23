import { Component, OnInit } from '@angular/core';
import { AccesoService } from 'src/app/services/documento/acceso/acceso.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AccesoCliente } from 'src/app/model/acceso_cliente';

@Component({
  selector: 'app-crear-acceso-cliente',
  templateUrl: './crear-acceso-cliente.component.html',
  styleUrls: ['./crear-acceso-cliente.component.css']
})
export class CrearAccesoClienteComponent implements OnInit {
  public idCliente;
  public acceso: AccesoCliente;

  constructor(
    private accesoService: AccesoService, private route: ActivatedRoute,
    private router: Router) {}

  ngOnInit() {
    this.obtenerId();
    this.acceso = new AccesoCliente(null, '', '', '', null);
  }

  //OBTENER ID CLIENTE
  obtenerId() {
    this.idCliente = this.route.snapshot.paramMap.get('idCliente');
  }
  //CREAR ACCESO
  crearAcceso(valid) {
    if (valid) {
      this.acceso.password = btoa(this.acceso.password);
      this.acceso.clienteId = this.idCliente;
      this.accesoService.crearAccesoCliente(this.acceso).subscribe(
        (response: any) => {
          if (response.acceso) {
            this.router.navigateByUrl(`/gestion/clientes/ver-cliente/${this.idCliente}`);
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
