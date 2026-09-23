import { Component, OnInit } from '@angular/core';

//SERVICIOS
import { StockService } from '../../../services/stock/stock.service';
import { LoginService } from '../../../services/login/login.service';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit {
  public usuario;
  public stocks;
  public createStock = false;
  public page = 1;
  public pageSize = 12;
  public loading: Boolean = true;

  constructor(
    private stockService: StockService, private loginService: LoginService,
    private alertaService:AlertasService  
  ) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerStocks();
  }

  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }

  //OBTENER STOCK
  obtenerStocks() {
    this.stockService.obtenerStocks().subscribe(
      (response: any) => {
        this.stocks = response.stocks;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  //ELIMINAR STOCK
  eliminarStock(id) {
    swal.fire({
      title: '¿Estas seguro?',
      text: 'Vas a eliminar el stock agregado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, ¡Eliminar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.stockService.eliminarStock(id).subscribe(
          (response: any) => {
            this.loading = !this.loading;
            this.obtenerStocks();
            this.alertaService.alertaExitoMsj('Tu Stock ha sido eliminado.')
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }
}
