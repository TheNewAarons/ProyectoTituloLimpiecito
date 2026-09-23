import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'

//SERVICIOS
import { UsuarioService } from '../../../services/usuario/usuario.service';
import { RoleService } from '../../../services/role/role.service';
import { LoginService } from './../../../services/login/login.service';

//MODELOS
import { Usuario }  from '../../../model/usuario';

declare const $: any;
import swal from 'sweetalert2';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

@Component({
  selector: 'app-usuario',
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit {

  public usuario:Usuario;
  public usuarioEdit:Usuario;
  public usuarios;
  public usuariosInactivos;
  public respuesta;
  public roles=[];
  public rolesOri;
  public usuarioLog;

  public searchActivo;
  public searchInactivo;

  public passNew = null;

  public page = 1;
  public pageSize = 12;
  public page1 = 1;
  public pageSize1 = 12;
  

  constructor(
    private router:Router,private usuarioService:UsuarioService,
    private rolService:RoleService, private loginService: LoginService,
    private alertaService:AlertasService
  ) { }

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.obtenerUsuarios();
    this.obtenerUsuariosInactivos();
    this.usuario = new Usuario(1,"","","","","",1,null);
    this.usuarioEdit = new Usuario(1,"","","","","",1,null);
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario(){
    this.usuarioLog = this.loginService.obtenerDatosUsuario();
    this.obtenerRoles();
  }
  //OBTENER ROLES
  obtenerRoles(){
    this.rolService.obtenerRolesActivos().subscribe(
      response => {
        this.respuesta = response;
        this.rolesOri = this.respuesta.roles;
        this.generaRoles();
      },
      error => {
        console.log(error);
      }
    )
  }
  //GENERAR ROLES DEPENDIENDO EL ROLE, PARA ASIGNAR A USUARIOS
  generaRoles(){
    this.rolesOri.forEach(element => {
      if(element.id > this.usuarioLog.role.id){
        this.roles.push(element);
      }
    });
    //console.log(this.roles);
  }
  //CREAR USUARIO
  crearUsuario(valid){
    if(valid){
      /** para el trabajador */
      this.usuario.rut = this.usuario.rut.replace(/\./g,'');
      this.usuario.rut = this.usuario.rut.replace(/-/g,'');
      let crypt = this.encriptar(this.usuario.password);
      this.usuario.password = crypt;
      this.usuarioService.crearUsuario(this.usuario).subscribe(
        response => {
          this.usuario = new Usuario(1,"","","","","",1,1);
          this.obtenerUsuarios();
          this.obtenerUsuariosInactivos();
          $("#createModal").modal('hide');
          this.alertaService.alertaExitoMsj('Usuario Creado Correctamente')
        },
        error => {
          console.log(error);
        }
      )
    }
  }
  //ASIGNAR EDITAR
  asignarEditar(usuario_editar){
    this.usuarioEdit = Object.assign({},usuario_editar);
  }
  //EDITAR USUARIO
  editarUsuario(valid){
    if(valid){
      /** para el trabajador */
      //  this.usuarioEdit.rut = this.usuarioEdit.rut.replace(/\./g,'');
      //  this.usuarioEdit.rut = this.usuarioEdit.rut.replace(/-/g,'');
      this.usuarioService.editarUsuario(this.usuarioEdit,this.usuarioEdit.id).subscribe(
        response => {
          this.respuesta = response;
          this.obtenerUsuarios();
          $('#editModal').modal('hide');
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Usuario Editado Correctamente')
          }
        },
        error => {
          console.log(error);
        }
      ) 
    }
  }
  //EDITAR PASSWORD USUARIO
  editarPasswordUsuario(valid){
    if(valid){
      let crypt = this.encriptar(this.passNew);
      this.usuarioEdit.password = crypt;
      this.usuarioService.editarPasswordUsuario(this.usuarioEdit,this.usuarioEdit.id).subscribe(
        response => {
          this.respuesta = response;
          this.obtenerUsuarios();
          $("#myModalEditPassword").modal('hide');
          this.passNew = null;
          if(this.respuesta.filas != 0){
            this.alertaService.alertaExitoMsj('Contraseña Editada Correctamente')
          }else{
            this.alertaService.alertaErrorMsj('Misma Contraseña Anterior')
          }
        },
        error => {
          console.log(error)
        }
      )
    }
  }
  //OBTENER USUARIOS
  obtenerUsuarios(){
    this.usuarioService.obtenerUsuarios().subscribe(
      response => {
        this.respuesta = response;
        this.usuarios = this.respuesta.usuarios;
      },
      error => {
        console.log(error);
      }
    )
  }
  //OBTENER USUARIOS INACTIVOS
  obtenerUsuariosInactivos(){
    this.usuarioService.obtenerUsuariosInactivos().subscribe(
      response => {
        this.respuesta = response;
        this.usuariosInactivos = this.respuesta.usuariosInactivos;
      },
      error => {
        console.log(error);
      }
    )
  }

  //DESACTIVAR UN USUARIO
  eliminarUsuario(id){
    swal.fire({
      title: '¿Estas seguro?',
      text: "Vas a desactivar a este usuario.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Desactivar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.usuarioService.eliminarUsuario(id).subscribe(
          response =>{
            this.obtenerUsuarios();
            this.obtenerUsuariosInactivos();
            this.alertaService.alertaExitoMsj('Usuario Desactivado Correctamente')
          },
          error => {
            console.log(error)
          }
        )
        
      }
    })
  }
  //ACTIVAR UN USUARIO
  activarUsuario(id){
    swal.fire({
      title: '¿Estas seguro?',
      text: "Vas a activar a este usuario.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'btn btn-success',
      cancelButtonColor: 'btn btn-danger',
      confirmButtonText: 'Si, Activar!',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.value) {
        this.usuarioService.activarUsuario(id).subscribe(
          response =>{
            this.obtenerUsuarios();
            this.obtenerUsuariosInactivos();
            this.alertaService.alertaExitoMsj('Usuario Activado Correctamente')
          },
          error => {
            console.log(error)
          }
        )
      }
    })
  }
  //ENCRIPTAR PASSWORD
  encriptar(crypt){
    let cripto = btoa(crypt);
    return cripto;
  }
  //BUSCA USUARIOS INACTIVOS
  buscarActivo(){
    this.usuarioService.buscarActivos(this.searchActivo).subscribe(
      response => {
        this.respuesta = response;
        this.usuarios = this.respuesta.usuarios;
      },
      error => {
        console.log(error);
      }
    )
  }
  //BUSCA USUARIOS INACTIVOS
  buscarInactivo(){
    this.usuarioService.buscarInactivos(this.searchInactivo).subscribe(
      response => {
        this.respuesta = response;
        this.usuariosInactivos = this.respuesta.usuariosInactivos;
      },
      error => {
        console.log(error);
      }
    )
  }
  
}
