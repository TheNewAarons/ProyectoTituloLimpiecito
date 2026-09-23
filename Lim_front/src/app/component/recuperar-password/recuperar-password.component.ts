import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

declare var $: any;

//SERVICIOS
import { LoginService } from '../../services/login/login.service';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.css']
})
export class RecuperarPasswordComponent implements OnInit {

  test: Date = new Date();
  private toggleButton: any;
  private sidebarVisible: boolean;
  private nativeElement: Node;
  //RECUPERAR PASSWORD
  public token;
  public usuario;
  public new_password=''

  constructor(
    private element: ElementRef,private loginService:LoginService,
    private router:Router, private route:ActivatedRoute
  ) {
      this.nativeElement = element.nativeElement;
      this.sidebarVisible = false;
  }
  ngOnInit() {
    this.obtenerToken() 
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

  //OBTENER TOKEN URL
  obtenerToken(){
    this.token = this.route.snapshot.paramMap.get('token');
    this.verificarToken(this.token);
  }

  //VERIFICAR VALIDEZ DEL TOKEN 
  verificarToken(token){
    let payload 
    if(token){
        payload = token.split('.')[1]
        payload = window.atob(payload)
        this.usuario = JSON.parse(payload)
        if(!( this.usuario.exp > Date.now()/1000)){
          this.router.navigateByUrl('/')
        }
    }else{
        this.router.navigateByUrl('/')
    }
  }
 //ENCRIPTAR
 encriptar(crypt){
  let cripto = btoa(crypt);
 
  return cripto;
  } 

  //CAMBIAR CONTRASEÑA
  cambiarPassword(){
    this.loginService.cambiarPass(this.usuario.id,this.usuario.correo,this.usuario.password,this.encriptar(this.new_password)).subscribe(
      (response:any)=>{
        if(response.filas > 0){
          alert(response.mensaje)
          this.router.navigateByUrl('/');
        }else{
          alert(response.mensaje) 
        }
      },
      error => {
        console.log(error);
      }
    )

  }

}
