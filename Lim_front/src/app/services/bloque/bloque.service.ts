import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class BloqueService {

  public url_backend;

  constructor(private http: HttpClient) {
    this.url_backend = environment.url + '/md_app/bloque';
  }

  //CREAR BLOQUES
  crearBloque(bloques) {
    return this.http.post(this.url_backend + '/crear', { bloques });
  }

  //DESACTIVAR BLOQUE
  desactivarBloque(idBloque){
    return this.http.delete(this.url_backend+ '/desactivar/'+ idBloque)
  }
  //ACTIVAR BLOQUE
  activarBloque(idBloque){
    return this.http.delete(this.url_backend+ '/activar/' +idBloque)
  }
}
