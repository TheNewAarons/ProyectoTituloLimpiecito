import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import PerfectScrollbar from 'perfect-scrollbar';
//SERVICIO
import { LoginService } from '../services/login/login.service';

declare const $: any;

export interface RouteInfo {
  path: string;
  title: string;
  type: string;
  icontype: string;
  collapse?: string;
  children?: ChildrenItems[];
}

export interface ChildrenItems {
  path: string;
  title: string;
  ab: string;
  type?: string;
}

//ITEMS DEL MENU
export const ROUTES: RouteInfo[] = [
  {
    path: '/dashboard',
    title: 'Inicio',
    type: 'link',
    icontype: 'home'
  },
  {
    path: '/cajas',
    title: 'Caja Mensual',
    type: 'link',
    icontype: 'savings'
  },
  ,
  {
    path: '/centro_costos',
    title: 'Centro Costos',
    type: 'link',
    icontype: 'view_cozy'
  },
  {
    path: '/bodega',
    title: 'Bodega',
    type: 'sub',
    icontype: 'store',
    collapse: 'bodega',
    children: [
      { path: 'producto', title: 'Producto EPP ', ab: 'P' },
      { path: 'stock', title: 'Agregar Stock', ab: 'S' }
    ]
  },
  {
    path: '/colaborador',
    title: 'Colaborador',
    type: 'sub',
    icontype: 'diversity_3',
    collapse: 'colaborador',
    children: [
      { path: 'trabajador', title: 'Trabajadores', ab: 'Tr' },
      { path: 'liquidacion', title: 'Liquidaciones', ab: 'Lq' }
      //{path: 'Vestimenta', title: 'Vestimentas', ab:'P'},//
    ]
  },
  {
    path: '/descuento',
    title: 'Descuento',
    type: 'sub',
    icontype: 'money_off',
    collapse: 'descuento',
    children: [
      { path: 'prevision', title: 'Previsiones', ab: 'Pr' },
      { path: 'salud', title: 'Salud', ab: 'A' },
      { path: 'seguro', title: 'Seguros', ab: 'S' }
    ]
  },
  {
    path: '/gestion',
    title: 'Gestión',
    type: 'sub',
    icontype: 'apartment',
    collapse: 'gestion',
    children: [
      { path: 'usuarios', title: 'Usuarios', ab: 'Us' },
      { path: 'clientes', title: 'Clientes', ab: 'CL' },
      { path: 'egreso', title: 'Egresos', ab: 'E' }
    ]
  },
  {
    path: '/archivo',
    title: 'Archivo',
    type: 'sub',
    icontype: 'apps',
    collapse: 'archivo',
    children: [
      { path: 'categorias', title: 'Categorias Documentos', ab: 'CD' },
      { path: 'documentos', title: 'Documentos', ab: 'DC' }
      // { path: 'asociaciones', title: 'Asociaciones', ab: 'AS' },
      // { path: 'descargas', title: 'Descargas', ab: 'DW' }
    ]
  },
  {
    path: '/adm_servicio',
    title: 'Adm Servicios',
    type: 'sub',
    icontype: 'cleaning_services',
    collapse: 'cate_servicios',
    children: [
      { path: 'cate_servicios', title: 'Servicios', ab: 'SE' },
      { path: 'servicios', title: 'Productos', ab: 'PR' },
      { path: 'reservas', title: 'Reservas', ab: 'RE' },
      { path: 'usuario-activos', title: 'Usuario App', ab: 'UA' },
      { path: 'instructivos', title: 'Instructivos', ab: 'IN' }
    ]
  },
  {
    path: '/pagina_web',
    title: 'Pagina Web',
    type: 'sub',
    icontype: 'public',
    collapse: 'pagina_web',
    children: [
      { path: 'anuncios', title: 'Anuncios', ab: 'AN' }
    ]
  },
  {
    path: '/carpeta',
    title: 'Documentos',
    type: 'sub',
    icontype: 'folder',
    collapse: 'carpeta',
    children: [
      { path: 'vista_clientes', title: 'Clientes', ab: 'CL' }
    ]
  },
  {
    path:'/cronograma/vista_clientes',
    title: 'Cronograma',
    type:'link',
    icontype:'folder',
  }
];
@Component({
  selector: 'app-sidebar-cmp',
  templateUrl: 'sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  public usuario;
  public role;
  public menuItems: any[];
  ps: any;
  isMobileMenu() {
    if ($(window).width() > 991) {
      return false;
    }
    return true;
  }
  constructor(private loginService: LoginService, private route: Router) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.menuItems = ROUTES.filter((menuItem) => menuItem);
    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      const elemSidebar = <HTMLElement>document.querySelector('.sidebar .sidebar-wrapper');
      this.ps = new PerfectScrollbar(elemSidebar);
    }
  }
  updatePS(): void {
    if (window.matchMedia(`(min-width: 960px)`).matches && !this.isMac()) {
      this.ps.update();
    }
  }
  isMac(): boolean {
    let bool = false;
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.platform.toUpperCase().indexOf('IPAD') >= 0) {
      bool = true;
    }
    return bool;
  }
  //IR A EDITAR PERFIL
  editar() {
    this.route.navigate(['/perfil']);
  }
  //CERRAR SESIÓN
  logOut() {
    this.loginService.logout();
  }
  //OBTENER DATOS DEL USUARIO LOGEADO
  obtenerDatosUsuario() {
    this.usuario = this.loginService.obtenerDatosUsuario();
    this.role = this.usuario.role.nombre;
    //console.log(this.role);
  }
}
