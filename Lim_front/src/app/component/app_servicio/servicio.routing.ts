import { Routes } from '@angular/router';
//SERVICIO
import { ServicioInactivoComponent } from './servicio/servicio-inactivo/servicio-inactivo.component';
import { ServicioActivoComponent } from './servicio/servicio-activo/servicio-activo.component';
import { CrearServicioComponent } from './servicio/crear-servicio/crear-servicio.component';
import { EditarServicioComponent } from './servicio/editar-servicio/editar-servicio.component';
import { VerServicioComponent } from './servicio/ver-servicio/ver-servicio.component';
//CATEGORIA SERVICIO
import { CateServicioActivoComponent } from './cate_servicio/cate-servicio-activo/cate-servicio-activo.component';
import { CateServicioInactivoComponent } from './cate_servicio/cate-servicio-inactivo/cate-servicio-inactivo.component';
import { EditarCateServicioComponent } from './cate_servicio/editar-cate-servicio/editar-cate-servicio.component';
import { CrearCateServicioComponent } from './cate_servicio/crear-cate-servicio/crear-cate-servicio.component';
import { VerCateServicioComponent } from './cate_servicio/ver-cate-servicio/ver-cate-servicio.component';
//HORARIO
import { CrearHorarioComponent } from './horario/crear-horario/crear-horario.component';
import { EditarHorarioComponent } from './horario/editar-horario/editar-horario.component';

//RESERVA
import { VerReservaComponent } from './reserva/ver-reserva/ver-reserva.component';
import { ReservaProcesoComponent } from './reserva/reserva-proceso/reserva-proceso.component';
import { ReservaRechazadoComponent } from './reserva/reserva-rechazado/reserva-rechazado.component';
import { ReservaAprobadoComponent } from './reserva/reserva-aprobado/reserva-aprobado.component';
import { ReservaFinalizadoComponent } from './reserva/reserva-finalizado/reserva-finalizado.component';
import { ReservasComponent } from './reserva/reservas/reservas.component';
//USUARIO APP
import { UsuarioActivosComponent } from './usuarioApp/usuario-activos/usuario-activos.component';
import { UsuarioInactivosComponent } from './usuarioApp/usuario-inactivos/usuario-inactivos.component';
import { VerUsuarioComponent } from './usuarioApp/ver-usuario/ver-usuario.component';
//BLOQUES
import { GenerarBloqueComponent } from './horario/generar-bloque/generar-bloque.component';

//INSTRUCTIVO
import { CrearInstructivoComponent } from './instructivo/crear-instructivo/crear-instructivo.component';
import { EditarInstructivoComponent } from './instructivo/editar-instructivo/editar-instructivo.component';
import { InstructivosComponent } from './instructivo/instructivos/instructivos.component';

//IMAGEN EXTRA
import { CrearImgExtraComponent } from './img_extra/crear-img-extra/crear-img-extra.component';
import { EditarImgExtraComponent } from './img_extra/editar-img-extra/editar-img-extra.component';


export const serviceRoutes: Routes = [
  { path: '', children: [{ path: 'adm_servicio/cate_servicios', component: CateServicioActivoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/cate_servicio-inactivo', component: CateServicioInactivoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/crear-cate_servicio', component: CrearCateServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/editar-cate_servicio/:idCateServicio', component: EditarCateServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/ver-cate_servicio/:idCateServicio', component: VerCateServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/servicios', component: ServicioActivoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/servicios-inactivos', component: ServicioInactivoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/crear-servicio', component: CrearServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/editar-servicio/:idServicio', component: EditarServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/ver-servicio/:idServicio', component: VerServicioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/crear-horario/:idCateServicio', component: CrearHorarioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/editar-horario/:idHorario', component: EditarHorarioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/reservas', component: ReservasComponent }] },
  { path: '', children: [{ path: 'adm_servicio/reserva-proceso/:idCateServicio/:nombre', component: ReservaProcesoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/reserva-rechazado/:idCateServicio/:nombre', component: ReservaRechazadoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/reserva-aprobado/:idCateServicio/:nombre', component: ReservaAprobadoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/reserva-finalizado/:idCateServicio/:nombre', component: ReservaFinalizadoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/ver-reserva/:reservaId', component: VerReservaComponent }] },
  { path: '', children: [{ path: 'adm_servicio/usuario-activos', component: UsuarioActivosComponent }] },
  { path: '', children: [{ path: 'adm_servicio/usuario-inactivos', component: UsuarioInactivosComponent }] },
  { path: '', children: [{ path: 'adm_servicio/ver-usuario/:idUsuario', component: VerUsuarioComponent }] },
  { path: '', children: [{ path: 'adm_servicio/generar-bloque/:idDia/:idCate', component: GenerarBloqueComponent }] },
  { path: '', children: [{ path: 'adm_servicio/instructivos', component: InstructivosComponent }] },
  { path: '', children: [{ path: 'adm_servicio/crear-instructivo', component: CrearInstructivoComponent }] },
  { path: '', children: [{ path: 'adm_servicio/editar-instructivo/:idInstructivo', component: EditarInstructivoComponent  }] },
  { path: '', children: [{ path: 'adm_servicio/crear-img-extra/:idCateServicio', component: CrearImgExtraComponent  }] },
  { path: '', children: [{ path: 'adm_servicio/editar-img-extra/:idImg', component: EditarImgExtraComponent  }] },
  
 


];
