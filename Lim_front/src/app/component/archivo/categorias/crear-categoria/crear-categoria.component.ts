import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
//MODELOS
import { Categoria } from '../../../../model/categoria';

//SERVICES
import { CategoriaService } from '../../../../services/documento/categoria/categoria.service';

declare const $: any;
import swal from 'sweetalert2';

@Component({
  selector: 'app-crear-categoria',
  templateUrl: './crear-categoria.component.html',
  styleUrls: ['./crear-categoria.component.css']
})
export class CrearCategoriaComponent implements OnInit {
  public categoria: Categoria;
  public tipos = ['Publico', 'Trabajador', 'Personalizado'];

  constructor(
    private categoriaService: CategoriaService, private router: Router
  ) {}

  ngOnInit() {
    this.categoria = new Categoria(null, '', '', null, true);
  }

  crearCategoria(valid) {
    if (valid) {
      this.categoriaService.crearCategoria(this.categoria).subscribe(
        (response) => {
          this.router.navigateByUrl('/archivo/categorias');
        },
        (error) => {
          console.log(error);
        }
      );
    }
  }
}
