import { Component, OnInit, ElementRef, OnDestroy } from '@angular/core';
//SERVICIOS
import { LoginService } from '../../services/login/login.service';
//MODELOS
import { Usuario } from '../../model/usuario';
import { Router } from '@angular/router';
import { AlertasService } from 'src/app/services/alertas/alertas.service';

declare var $: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

    test: Date = new Date();
    private toggleButton: any;
    private sidebarVisible: boolean;
    private nativeElement: Node;
    //DEL SERVICIO LOGIN
    public usuario:Usuario;
    public respuesta;
    public recuperar:Boolean = false;

    constructor(
        private element: ElementRef, private loginService:LoginService,
        private router:Router, private alertaService:AlertasService
        ) {
        this.nativeElement = element.nativeElement;
        this.sidebarVisible = false;
    }
    ngOnInit() {
        this.verificar();
        var navbar : HTMLElement = this.element.nativeElement;
        this.toggleButton = navbar.getElementsByClassName('navbar-toggle')[0];
        const body = document.getElementsByTagName('body')[0];
        body.classList.add('login-page');
        body.classList.add('off-canvas-sidebar');
        const card = document.getElementsByClassName('card')[0];
        setTimeout(function() {
            // after 1000 ms we add the class animated to the login/register card
            card.classList.remove('card-hidden');
        }, 700);
        this.usuario = new Usuario(1,'','','','','',null,null);
    }
    sidebarToggle() {
        var toggleButton = this.toggleButton;
        var body = document.getElementsByTagName('body')[0];
        var sidebar = document.getElementsByClassName('navbar-collapse')[0];
        if (this.sidebarVisible == false) {
            setTimeout(function() {
                toggleButton.classList.add('toggled');
            }, 500);
            body.classList.add('nav-open');
            this.sidebarVisible = true;
        } else {
            this.toggleButton.classList.remove('toggled');
            this.sidebarVisible = false;
            body.classList.remove('nav-open');
        }
    }
    ngOnDestroy(){
        const body = document.getElementsByTagName('body')[0];
        body.classList.remove('login-page');
        body.classList.remove('off-canvas-sidebar');
    }
    /** APARTE AGREGADO  */
    //LOGIN
    login(){
        this.alertaService.loading()
        let cryp = this.encriptar(this.usuario.password);
        this.usuario.password = cryp;
        this.loginService.login(this.usuario).subscribe(
            response => {
                this.alertaService.cerrarAlerta()
                this.respuesta = response;
                this.loginService.saveToken(this.respuesta.token);
                this.alertaService.showNotification('Inicio De Sesión Correctamente')
                this.router.navigateByUrl('/dashboard');
            },
            error => {
                this.alertaService.cerrarAlerta()
                this.usuario.password = '';
                this.alertaService.showNotification(error.error.text);
            }
        )
    }
    //VERIFICAR SI ESTA LOGGEADO
    verificar(){
        if(this.loginService.isLoggedIn()){
            this.router.navigateByUrl('/dashboard')
        }
    }
    //PRUEBA ENCRIPTAR
    encriptar(crypt){
        let cripto = btoa(crypt);
        return cripto;
    }
    //PRUEBA DESINCRIPTAR
    desincriptar(cript){
        let cripto = atob(cript);
        return cripto;
    }
    //CAMBIAR VALOR RECUPERAR
    cambiar(){
        this.recuperar = !this.recuperar
        }

    //RECUPERAR PASS
    recuperarPass(){
        if(this.usuario.correo != ''){
            this.alertaService.loading()
            this.loginService.recuperarPass(this.usuario.correo).subscribe(
                (response:any)=>{
                    this.alertaService.cerrarAlerta()
                    this.alertaService.showNotification(response.mensaje);
                },
                error =>{
                    this.alertaService.cerrarAlerta()
                    console.log(error)
                }
            )
        }else{
            this.alertaService.showNotification('Ingrese un correo por favor')
        }
        
    }
  
}
