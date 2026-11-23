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

  //ANULAR STOCK (RNF-ARQ-01, AUT-010): reemplaza la eliminación física. Solo Administrador y Operaciones (como el backend v1).
  puedeAnular(stock): boolean {
    const rol = this.usuario && this.usuario.role ? this.usuario.role.nombre : '';
    return !stock.anulada_at && (rol === 'Administrador' || rol === 'Operaciones');
  }

  anularStock(stock) {
    swal.fire({
      title: '¿Anular esta entrada?',
      text: 'Se descontarán ' + stock.cantidad + ' unidades de ' + (stock.producto ? stock.producto.nombre : 'el producto') +
        '. La entrada queda registrada como anulada.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo de la anulación',
      inputAttributes: { maxlength: '255' },
      inputValidator: (valor: string) => (!valor || valor.trim().length < 3 ? 'Indica el motivo (mínimo 3 caracteres)' : null),
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.stockService.anularStock(stock.id, String(result.value).trim(), this.loginService.getToken()).subscribe(
          () => {
            this.loading = !this.loading;
            this.obtenerStocks();
            this.alertaService.alertaExitoMsj('La entrada de stock fue anulada.');
          },
          (error) => this.mostrarErrorAnulacion(error)
        );
      }
    });
  }

  //MENSAJE SEGUN EL CODIGO HTTP DE /api/v1 ({ ok:false, error:{ code, message } })
  private mostrarErrorAnulacion(error) {
    const status = error ? error.status : 0;
    if (status === 401) {
      swal.fire({ title: 'Sesión expirada', text: 'Tu sesión expiró, vuelve a iniciar sesión.', icon: 'warning' })
        .then(() => this.loginService.logout());
      return;
    }
    let msj = 'No se pudo anular la entrada. Intenta nuevamente.';
    if (status === 0) {
      msj = 'No hay conexión con el servidor. Revisa tu conexión e intenta nuevamente.';
    } else if (status === 403) {
      msj = 'No tienes permiso para anular entradas de stock.';
    } else if (error.error && error.error.error && error.error.error.message) {
      const texto: string = error.error.error.message;
      msj = texto.charAt(0).toUpperCase() + texto.slice(1) + (/[.!?]$/.test(texto) ? '' : '.');
    }
    swal.fire({ title: 'No se pudo anular', text: msj, icon: 'error' });
    // 409: la entrada pudo cambiar (otro usuario la anuló o se consumió el stock); se recarga la lista.
    if (status === 409) {
      this.loading = true;
      this.obtenerStocks();
    }
  }
}
