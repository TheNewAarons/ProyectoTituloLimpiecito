import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http'; 
import { environment } from '../../../environments/environment'
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  //ANULAR STOCK (RNF-ARQ-01, v1): REVERSA en el kardex y la fila queda marcada, no se borra. Admin y Operaciones.
  anularStock(id: number, motivo: string, token: string): Observable<any> {
    return this.http.patch(this.url_backend + '/api/v1/bodega/stock-rapido/' + id + '/anular', { motivo: motivo },
      { headers: new HttpHeaders({ 'x-access-token': token || '' }) });
  }

  //BUSCAR PRODUCTO EN STOCK
  buscar(search){
    
  }


}
