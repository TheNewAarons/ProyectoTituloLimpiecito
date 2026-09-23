import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class StockService {

  public url_backend;

  constructor(private http:HttpClient) { 
    this.url_backend = environment.url
  }

  //CREAR STOCK RAPIDO
  crearStock(stocks){
    let detalles_stock = JSON.stringify(stocks);
    return this.http.post(this.url_backend+"/stock/crear", { stocks: detalles_stock});
  }

  //OBTENER STOCKS
  obtenerStocks(){
    return this.http.get(this.url_backend+"/stock/obtener");
  }

  //ELIMINAR STOCK
  eliminarStock(id){
    return this.http.delete(this.url_backend+"/stock/eliminar/"+id);
  }

  //BUSCAR PRODUCTO EN STOCK
  buscar(search){
    
  }


}
