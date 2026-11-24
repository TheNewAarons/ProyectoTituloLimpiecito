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
  roles?: string[];
  excluir?: string[];
}

export interface ChildrenItems {
  path: string;
  title: string;
  ab: string;
  type?: string;
  roles?: string[];
  excluir?: string[];
}

// roles: únicos roles con acceso (los mismos que exige el backend, spec §2.3); sin roles = todos.
// excluir: roles que ya redirigen los guards existentes (Restriccion/Archivo/LvlApp), solo para no mostrarles el ítem.
const ADMIN = ['Administrador'];
const ADMIN_OPS = ['Administrador', 'Operaciones'];
const APOYO = 'APOYO_LVL_1';
const ARCHIVO = 'LVL_ARCHIVO';
const LVL_APP = 'LVL_APP';

//ITEMS DEL MENU
export const ROUTES: RouteInfo[] = [
  {
    path: '/dashboard',
    title: 'Inicio',
    type: 'link',
    icontype: 'home',
    excluir: [APOYO, ARCHIVO, LVL_APP]
  },
  {
    path: '/cajas',
    title: 'Caja Mensual',
    type: 'link',
    icontype: 'savings',
    roles: ADMIN
  },
  {
    path: '/analytics',
    title: 'Analytics',
    type: 'link',
    icontype: 'insights',
    roles: ADMIN_OPS
  },
  {
    path: '/centro_costos',
    title: 'Centro Costos',
    type: 'link',
    icontype: 'view_cozy',
    excluir: [ARCHIVO, LVL_APP]
  },
  {
    path: '/bodega',
    title: 'Bodega',
    type: 'sub',
    icontype: 'store',
    collapse: 'bodega',
    excluir: [ARCHIVO, LVL_APP],
    children: [
      { path: 'inicio', title: 'Inicio Bodega', ab: 'IB', roles: ADMIN_OPS }, // RF-BOD-05: entrada del módulo
      { path: 'producto', title: 'Producto EPP ', ab: 'P' },
      { path: 'solicitudes', title: 'Solicitudes', ab: 'So', roles: ADMIN_OPS }, // RF-BOD-01
      { path: 'ordenes-compra', title: 'Órdenes De Compra', ab: 'OC', roles: ADMIN_OPS }, // RF-BOD-04
      { path: 'movimientos', title: 'Movimientos', ab: 'Mv', roles: ADMIN_OPS }, // RF-BOD-04
      { path: 'conteos', title: 'Conteos Físicos', ab: 'CF', roles: ADMIN_OPS }, // RF-BOD-07
      { path: 'stock', title: 'Agregar Stock', ab: 'S', roles: ADMIN_OPS }
    ]
  },
  {
    path: '/colaborador',
    title: 'Colaborador',
    type: 'sub',
    icontype: 'diversity_3',
    collapse: 'colaborador',
    excluir: [LVL_APP],
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
    excluir: [APOYO, ARCHIVO, LVL_APP],
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
    excluir: [LVL_APP],
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
    excluir: [APOYO, LVL_APP],
    children: [
      { path: 'categorias', title: 'Categorias Documentos', ab: 'CD' },
      { path: 'documentos', title: 'Documentos', ab: 'DC' },
      { path: 'documentos-publicos', title: 'Documentos Públicos', ab: 'DP', roles: ADMIN }
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
    excluir: [APOYO, ARCHIVO],
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
    excluir: [ARCHIVO],
    children: [
      { path: 'catalogo', title: 'Catálogo', ab: 'CA', roles: ADMIN },
      { path: 'anuncios', title: 'Anuncios', ab: 'AN' }
    ]
  },
  {
    path: '/carpeta',
    title: 'Documentos',
    type: 'sub',
    icontype: 'folder',
    collapse: 'carpeta',
    excluir: [APOYO, ARCHIVO, LVL_APP],
    children: [
      { path: 'vista_clientes', title: 'Clientes', ab: 'CL' }
    ]
  },
  // RF-PEV-01: asignación masiva de actividades PEV
  {
    path: '/pev/asignacion-masiva',
    title: 'Asignación PEV',
    type: 'link',
    icontype: 'group_add',
    roles: ADMIN
  },
  {
    path:'/cronograma/vista_clientes',
    title: 'Cronograma',
    type:'link',
    icontype:'folder',
  }
];

export function tieneAcceso(rol: string, item: { roles?: string[]; excluir?: string[] }): boolean {
  if (item.excluir && item.excluir.indexOf(rol) !== -1) return false;
  return !item.roles || item.roles.indexOf(rol) !== -1;
}

// Menú visible para el rol: oculta ítems sin acceso y submenús que quedan vacíos.
export function menuDelRol(rol: string): RouteInfo[] {
  return ROUTES.filter((item) => tieneAcceso(rol, item))
    .map((item) => (item.children ? { ...item, children: item.children.filter((hijo) => tieneAcceso(rol, hijo)) } : item))
    .filter((item) => !item.children || item.children.length > 0);
}

// Ítem del menú con `roles` que cubre la URL (por segmentos: 'bodega/producto' no cubre 'bodega/productos/1/kardex').
export function rolesDeUrl(url: string): string[] | null {
  const ruta = url.split(/[?#]/)[0];
  const cubre = (path: string): boolean => ruta === path || ruta.indexOf(path + '/') === 0;
  for (const item of ROUTES) {
    if (item.roles && cubre(item.path)) return item.roles;
    for (const hijo of item.children || []) {
      if (hijo.roles && cubre(item.path + '/' + hijo.path)) return hijo.roles;
    }
  }
  return null;
}
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
    this.menuItems = menuDelRol(this.role);
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
