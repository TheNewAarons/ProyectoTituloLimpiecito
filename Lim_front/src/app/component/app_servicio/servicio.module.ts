import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaterialModule } from '../../app.module';

import { NgxCleaveDirectiveModule } from 'ngx-cleave-directive';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { LoadingModule } from 'src/app/loading/loading.module';

import { serviceRoutes } from './servicio.routing';
//SERVICIOS
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
import { CrearObservacionComponent } from './observacion/crear-observacion/crear-observacion.component';
import { EditarObservacionComponent } from './observacion/editar-observacion/editar-observacion.component';
import { VerUsuarioComponent } from './usuarioApp/ver-usuario/ver-usuario.component';


import { EstadoPipe } from '../../pipe/estado.pipe';
//BLOQUES
import { GenerarBloqueComponent } from './horario/generar-bloque/generar-bloque.component';

//INSTRUCTIVO
import { CrearInstructivoComponent } from './instructivo/crear-instructivo/crear-instructivo.component';
import { EditarInstructivoComponent } from './instructivo/editar-instructivo/editar-instructivo.component';
import { InstructivosComponent } from './instructivo/instructivos/instructivos.component';

//IMAGEN EXTRA
import { CrearImgExtraComponent } from './img_extra/crear-img-extra/crear-img-extra.component';
import { EditarImgExtraComponent } from './img_extra/editar-img-extra/editar-img-extra.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(serviceRoutes),
    NgbModule,
    FormsModule,
    MaterialModule,
    NgxCleaveDirectiveModule,
    NgSelectModule,
    NgOptionHighlightModule,
    LoadingModule
  ],
  declarations: [
    ServicioActivoComponent,
    ServicioInactivoComponent,
    CrearServicioComponent,
    EditarServicioComponent,
    CateServicioActivoComponent,
    CateServicioInactivoComponent,
    EditarCateServicioComponent,
    CrearCateServicioComponent,
    VerCateServicioComponent,
    VerServicioComponent,
    CrearHorarioComponent,
    EditarHorarioComponent,
    VerReservaComponent,
    ReservaProcesoComponent,
    ReservaRechazadoComponent,
    ReservaAprobadoComponent,
    ReservaFinalizadoComponent,
    ReservasComponent,
    UsuarioActivosComponent,
    UsuarioInactivosComponent,
    CrearObservacionComponent,
    EditarObservacionComponent,
    EstadoPipe,
    VerUsuarioComponent,
    GenerarBloqueComponent,
    CrearInstructivoComponent,
    EditarInstructivoComponent,
    InstructivosComponent,
    CrearImgExtraComponent,
    EditarImgExtraComponent,
  ]
})
export class ServicioModule {}
