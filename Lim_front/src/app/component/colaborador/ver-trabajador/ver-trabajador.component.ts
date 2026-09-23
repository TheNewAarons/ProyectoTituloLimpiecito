import { Component, OnInit } from '@angular/core';
import { TrabajadorService } from 'src/app/services/trabajador/trabajador.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AccesoService } from 'src/app/services/documento/acceso/acceso.service';
import { AsociacionService } from 'src/app/services/documento/asociacion/asociacion.service';
import swal from 'sweetalert2';
declare const $: any;
import { LoginService } from 'src/app/services/login/login.service';
import { AccesoLaboralService } from 'src/app/services/trabajador/acceso-laboral.service';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-ver-trabajador',
  templateUrl: './ver-trabajador.component.html',
  styleUrls: ['./ver-trabajador.component.css']
})
export class VerTrabajadorComponent implements OnInit {
  public trabajador;
  public idTrabajador;
  public loading = true;
  public newPassword = '';
  public newCorreo = '';
  public usuario;
  public acceso_laboral;
  public credenciales = {
    correo: null,
    password: null,
    estado: 1,
    tipo:0,
    trabajadoreId: null
  }
  tipos = [
    {value: 0, nombre: 'Trabajador General'},
    {value: 1, nombre: 'Trabajador y Supervisor'},
  ];

  cambiarPassword:boolean = false
  nueva_password = ''

  constructor(
    private trabajadorService: TrabajadorService,private route: ActivatedRoute,
    private accesoService: AccesoService, private asociacionService: AsociacionService,
    private loginService: LoginService, private _accesoLaboralSrv: AccesoLaboralService,
    private _alertaSrv:AlertasService,
  ) {}

  ngOnInit() {
    this.obtenerId();
    this.obtenerDatosUsuario();
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
  }
  //OBTENER ID DE LA URL
  obtenerId() {
    this.idTrabajador = this.route.snapshot.paramMap.get('idTrabajador');
    this.obtenerDatosTrabajador(this.idTrabajador);
  }
  //OBTENER DATOS DEL TRABAJADOR
  obtenerDatosTrabajador(id) {
    this._alertaSrv.loading()
    this.trabajadorService.obtenerTrabajadorId(id).subscribe(
      (response: any) => {
        this.trabajador = response.trabajador;
        this.existeAccesoLaboral()
        this.loading = !this.loading;
      },
      (error) => {
        this._alertaSrv.cerrarAlerta()
        console.log(error);
      }
    );
  }

  existeAccesoLaboral(){
    this._accesoLaboralSrv.existeAccesoLaboral(this.idTrabajador).subscribe(
      (response: any) => {
        console.log(response)
        this.acceso_laboral = response
        if(this.acceso_laboral.estado){
          this._alertaSrv.cerrarAlerta()
          this.credenciales.correo = response.acceso_laboral.correo
          this.credenciales.password = response.acceso_laboral.password
          this.credenciales.trabajadoreId = response.acceso_laboral.trabajadoreId
          this.credenciales.tipo = response.acceso_laboral.tipo
        }else{
          this._alertaSrv.cerrarAlerta()
          this.credenciales.correo = this.trabajador.correo
        }
      },error =>{
        console.log(error)
      }
    )
  }

  encriptar(crypt){
    let cripto = btoa(crypt);
    return cripto;
  }

  crearAccesoLaboral(){
    this.credenciales.trabajadoreId = this.idTrabajador
    let cryp = this.encriptar(this.credenciales.password)
    this.credenciales.password = cryp;
    this._accesoLaboralSrv.crearAccesoLaboral(this.credenciales).subscribe(
      (response: any) => {
        this.obtenerDatosTrabajador(this.idTrabajador)
        this._alertaSrv.showNotification("Acceso creados correctamente")
      },error =>{
        console.log(error)
      }
    )
  }

  cambiarValorVariablePassword(){
    this.cambiarPassword = !this.cambiarPassword
  }

  actualizarAccesoLaboral(id){
    let acceso_actualizar
    if(this.cambiarPassword){
      acceso_actualizar = {
        correo: this.credenciales.correo,
        password: this.encriptar(this.nueva_password),
        tipo:this.credenciales.tipo
      }
    }else{
      acceso_actualizar = {
        correo: this.credenciales.correo,
        tipo:this.credenciales.tipo
      }
    }
    swal.fire({
      title: '¿Estas seguro?',
      text: "¡Vas a cambiar los datos de acceso laboral!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si, ¿Cambiar!',
      cancelButtonText:'Cancelar'
    }).then((result) => {
      if(result.isConfirmed){
        this._alertaSrv.loading()
        this._accesoLaboralSrv.actualizarAccesoLaboral(id,acceso_actualizar).subscribe(
          (response:any)=>{
            this._alertaSrv.cerrarAlerta()
            if(response.acceso_laboral){
              this.nueva_password = ''
              this.cambiarPassword = false
              swal.fire({
                title: 'Datos actualizados correctamente',
                timer: 1000,
                timerProgressBar: true,
                didOpen: () => {
                  swal.showLoading()
                },
                willClose: () => {
                  this.obtenerDatosTrabajador(this.idTrabajador)
                  this._alertaSrv.showNotification("Acceso ACTUALIZADOS correctamente")
                }
              })
            }
          },
          error => {
            this._alertaSrv.cerrarAlerta()
            this._alertaSrv.alertaErrorMsj(error.error.error)
            console.log(error)
          }
        )
      }
    })
  }
}
