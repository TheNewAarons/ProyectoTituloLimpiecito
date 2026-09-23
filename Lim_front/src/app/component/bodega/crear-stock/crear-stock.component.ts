import { Component, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';

//SERVICIOS
import { StockService } from '../../../services/stock/stock.service';
import { ProductoService } from '../../../services/producto/producto.service';
import { LoginService } from '../../../services/login/login.service';

//MODELOS
import { Stock } from '../../../model/stock';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-crear-stock',
  templateUrl: './crear-stock.component.html',
  styleUrls: ['./crear-stock.component.css']
})
export class CrearStockComponent implements OnInit {
  public usuario;
  public stock: Stock;
  public producto = null;
  public productos;
  public productosListo = false;
  public stock_actual;
  public detalle_stocks = [];
  public comentario;
  public cantidad;
  public loading: Boolean = true;

  constructor(
    private stockService: StockService, private productoService: ProductoService,
    private loginService: LoginService, private alertaService:AlertasService) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerProductos();
    this.stock = new Stock(1, null, '', null, null, '');
  }

  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER PRODUCTOS (TODOS LOS PRODUCTOS)
  obtenerProductos() {
    this.productosListo = true;
    this.productoService.obtenerProductos().subscribe(
      (response: any) => {
        this.productos = response.productos;
        this.productosListo = false;
        this.loading = !this.loading;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  //OBTENER STOCK DEL PRODUCTO ACTUAL
  obtenerStock() {
    if (this.producto != null) {
      this.productos.forEach((elemento) => {
        if (elemento.id == this.producto.id) {
          this.stock_actual = elemento.stock;
        }
      });
    } else {
      this.stock_actual = null;
    }
  }
  //AGREGAR STOCK AL DETALLE DE STOCKS
  agregar() {
    this.productos.forEach((element) => {
      if (element.id == this.producto.id) {
        this.stock.productoId = this.producto.id;
        this.stock.cantidad = this.cantidad;
        this.stock.comentario = this.comentario;
        this.stock.nombre_producto = this.producto.nombre;
        this.stock.fecha = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-US');
        this.detalle_stocks.push(this.stock);
      }
    });
    this.limpiar();
  }
  //LIMPIAR
  limpiar() {
    this.stock = new Stock(1, null, '', null, null, '');
    this.producto = null;
    this.cantidad = null;
    this.comentario = null;
    this.stock_actual = null;
  }
  //ELIMINAR STOCK DEL DETALLE
  eliminarDetalle(detalle) {
    var pos = this.detalle_stocks.indexOf(detalle);
    this.detalle_stocks.splice(pos, 1);
  }
  //CREAR STOCK FAST
  crearStock() {
    this.stockService.crearStock(this.detalle_stocks).subscribe(
      (response: any) => {
        this.loading = !this.loading;
        setTimeout(() => {
          this.limpiar();
          this.detalle_stocks = [];
          this.obtenerProductos();
          this.alertaService.alertaExitoMsj('Stock Añadido Correctamente!')
        }, 1500);
      },
      (error) => {
        console.log(error);
      }
    );
  }
}
