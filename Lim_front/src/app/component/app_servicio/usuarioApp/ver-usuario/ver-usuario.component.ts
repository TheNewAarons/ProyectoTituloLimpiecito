import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppUsuarioService } from 'src/app/services/appUsuario/app-usuario.service';
import { ReservaService } from 'src/app/services/reserva/reserva.service';

@Component({
  selector: 'app-ver-usuario',
  templateUrl: './ver-usuario.component.html',
  styleUrls: ['./ver-usuario.component.css']
})
export class VerUsuarioComponent implements OnInit {

  public idUsuario;
  public usuario;
  public reservas = [];
  public loading = true 
  public page = 1
  public pageSize = 10;
  public nombre;
  public estado = 'null';
  public estados = [{ valor:'null',nombre:'Todos'},{ valor:1,nombre:'Finalizado'},{ valor:2,nombre:'Aprobado'},{ valor:3,nombre:'En Proceso'},{ valor:4,nombre:'Rechazado'}]

  constructor(
    private route:ActivatedRoute, private appUsuarioService:AppUsuarioService,
    private reservaService:ReservaService
  ) { }

  ngOnInit() {
    this.obtenerId()
  }

  //OBTENER ID
  obtenerId(){
    this.idUsuario = this.route.snapshot.paramMap.get('idUsuario');
    this.obtenerUsuario(this.idUsuario);
  }

  //OBTENER USUARIO
  obtenerUsuario(idUsuario){
    this.appUsuarioService.obtenerUsuarioApp(idUsuario).subscribe(
      (response:any)=> {
        this.nombre = response.usuario.nombre
        this.usuario = response.usuario;
        this.obtenerReservas(idUsuario,null)
      },
      error => {
        console.log(error);
      }
    )
  }

  //OBTENER RESERVAS
  obtenerReservas(idUsuario,estado){
    this.reservaService.obtenerReservasUsuario(idUsuario,estado).subscribe(
      (response:any)=>{
        this.reservas = response.reservas
        this.loading = !this.loading
      },
      error => {
        console.log(error);
      }
    )
  }
  //BUSCAR POR CATEGORIA ID
  buscar(){
    this.loading = !this.loading
    this.obtenerReservas(this.idUsuario,this.estado);
  }

}
