const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config()
const path = require('path');

const app = express();
const cron = require('node-cron');

//app.use(express.json());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
// set the view engine to ejs para vistas en nodeJS
app.set('view engine', 'ejs');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use('/web-limpiecito/uploads', express.static(path.resolve('uploads')));
app.use('/web-limpiecito/uploads_limpiecitoweb', express.static(path.resolve('uploads_limpiecitoweb')));

// app.use('/api-aseo/uploads', express.static(path.resolve('uploads')));
// app.use('/api-aseo/uploads_limpiecitoweb', express.static(path.resolve('uploads_limpiecitoweb')));

const api = express.Router();
// SOLO RUTAS

api.get('/prueba', async (req, res) => {
  return res.json({ mensaje: 'Funcionando back limpiecito' });
});

/*** --------------------- */
/*** --------------------- */
//Rutas para Usuario
// const Usuarios = require('./routes/sistema_base/Usuario'); // antiguo
const Usuarios = require('./api/apartado_base/usuario/routes');
api.use('/usuario', Usuarios);

//Rutas para Caja
// const Cajas = require('./routes/sistema_base/Caja'); //antiguo
const Cajas = require('./api/apartado_base/caja/routes');
api.use('/caja', Cajas);

//Rutas para Venta
// const Roles = require('./routes/sistema_base/Role'); //antiguo
const Roles = require('./api/apartado_base/rol/routes');
api.use('/rol', Roles);

//Rutas para Cliente
// const Clientes = require('./routes/sistema_base/Cliente'); //antiguo
const Clientes = require('./api/apartado_base/cliente/routes');
api.use('/cliente', Clientes);

//Rutas para Producto
// const Productos = require('./routes/sistema_base/Producto'); //antiguo
const Productos = require('./api/apartado_base/producto/routes');
api.use('/producto', Productos);

//Rutas para Salude
// const Saludes = require('./routes/sistema_base/Salude'); //antiguo
const Saludes = require('./api/apartado_base/salud/routes');
api.use('/salud', Saludes);

//Rutas para Seguro
// const Seguros = require('./routes/sistema_base/Seguro'); //antiguo
const Seguros = require('./api/apartado_base/seguro/routes');
api.use('/seguro', Seguros);

//Rutas para Instituto_prevision
// const Instituto_previsione = require('./routes/sistema_base/Instituto_previsione'); //antiguo
const Instituto_previsione = require('./api/apartado_base/instituto_prevision/routes');
api.use('/instituto_prevision', Instituto_previsione);

//Rutas para Vestimenta
// const Vestimentas = require('./routes/sistema_base/Vestimenta'); //antiguo
const Vestimentas = require('./api/apartado_base/vestimenta/routes');
api.use('/vestimenta', Vestimentas);

//Rutas para Trabajador
// const Trabajadore = require('./routes/sistema_base/Trabajadore'); //antiguo
const Trabajadore = require('./api/apartado_base/trabajador/routes');
api.use('/trabajador', Trabajadore);

//Ruta para Stock Rapido
// const Stock = require('./routes/sistema_base/Stock_rapido'); //antiguo
const Stock = require('./api/apartado_base/stock_rapido/routes');
api.use('/stock', Stock);

//Ruta para Centro de costo
// const Centro = require('./routes/sistema_base/Centro_costo'); //antiguo
const Centro = require('./api/apartado_base/centro_costo/routes');
api.use('/centro', Centro);

//Ruta para Centro de costo
// const Egreso = require('./routes/sistema_base/Egreso'); //antiguo
const Egreso = require('./api/apartado_base/egreso/routes');
api.use('/egreso', Egreso);

//Ruta para Centro de costo
// const DetalleCentro = require('./routes/sistema_base/DetalleCentro'); //antiguo
const DetalleCentro = require('./api/apartado_base/detalle_centro/routes');
api.use('/detalle', DetalleCentro);

//Ruta para Liquidacion
// const Liquidacion = require('./routes/sistema_base/Liquidacion'); //antiguo
const Liquidacion = require('./api/apartado_base/liquidacion/routes');
api.use('/liquidacion', Liquidacion);

//Ruta nueva recuperar password
// const Recuperar = require('./routes/sistema_base/Recuperar_pass'); //antiguo
const Recuperar = require('./api/apartado_base/recuperar_pass/routes');
api.use('/recuperar', Recuperar);

/*** --------------------- */

/**** RUTAS DE MODULO DOCUMENTOS!! ******/

//Ruta para categorias de documentos
const Categoria = require('./routes/documentos/Categoria');
api.use('/categoria', Categoria);

//Ruta para documentos
const Documento = require('./routes/documentos/Documento');
api.use('/documento', Documento);

//Ruta para asociacion de documentos
const Asociacion = require('./routes/documentos/Asociacion');
api.use('/asociacion', Asociacion);

//Ruta para descargas de documentos
const Descarga = require('./routes/documentos/Descarga');
api.use('/descarga', Descarga);

//Ruta para crear accesos
const Acceso = require('./routes/documentos/Acceso');
api.use('/acceso', Acceso);

/*** --------------------- */

//RUTAS SISTEMA CLIENTE
//login
const Login = require('./routes/sist_cliente/Login');
api.use('/login_cliente', Login);
//archivos
const Archivos = require('./routes/sist_cliente/Documentos');
api.use('/archivo_cliente', Archivos);

/*** --------------------- */

/** RUTAS MODULO APP  */

const Cate_servicio = require('./routes/sist_app/Categoria_servicio');
api.use('/md_app/cate_servicio', Cate_servicio);

const Servicio = require('./routes/sist_app/Servicio');
api.use('/md_app/servicio', Servicio);

const Horario = require('./routes/sist_app/Horarios');
api.use('/md_app/horario', Horario);

const Reserva = require('./routes/sist_app/Reserva');
api.use('/md_app/reserva', Reserva);

const App_usuario = require('./routes/sist_app/Usuario_app');
api.use('/md_app/usuario', App_usuario);

const Observacion = require('./routes/sist_app/Observacion');
api.use('/md_app/observacion', Observacion);

const Bloque = require('./routes/sist_app/Bloque');
api.use('/md_app/bloque', Bloque);

const Instructivo = require('./routes/sist_app/Instructivo');
api.use('/md_app/instructivo', Instructivo);

const Dia = require('./routes/sist_app/dia/controlador');
api.use('/md_app/dia', Dia);

/*** --------------------- */

/** RUTAS PARA LA APP  */

const Cate_serv_app = require('./routes/rutas_app/Cate_servicio');
api.use('/app_lim/cate_servicio', Cate_serv_app);

const Servicio_app = require('./routes/rutas_app/Servicio');
api.use('/app_lim/servicio', Servicio_app);

const Reserva_app = require('./routes/rutas_app/Reserva');
api.use('/app_lim/reserva', Reserva_app);

const Usuario_app = require('./routes/rutas_app/Usuario');
api.use('/app_lim/usuario', Usuario_app);

const Login_app = require('./routes/rutas_app/Login');
api.use('/app_lim/login', Login_app);

const Instructivo_app = require('./routes/rutas_app/Instructivo');
api.use('/app_lim/instructivo', Instructivo_app);

const Recuperar_pass_app = require('./routes/rutas_app/Recuperar_password');
api.use('/app_lim/recuperar', Recuperar_pass_app);

/*** --------------------- */

/** RUTAS SISTEMA_WEB PAGINA DE LIMPIECITO */

// para documentos
const Documento_web = require('./routes/sistema_web/Documentos');
api.use('/documento_web', Documento_web);
// para formulario contactanos
const Contactanos_web = require('./routes/sistema_web/Contactanos');
api.use('/contactanos_web', Contactanos_web);
// para anuncios
const Anuncio_web = require('./routes/sistema_web/Anuncios');
api.use('/anuncios_web', Anuncio_web);

/*** ---------------------- */


/** RUTAS SISTEMA DOCUMENTOS CLIENTES */
const Carpeta_padre = require('./routes/doc_cliente/Carpeta_padre');
api.use('/carpeta_padre', Carpeta_padre);
const Carpeta = require('./routes/doc_cliente/Carpeta');
api.use('/carpeta', Carpeta);
const Carp_documento = require('./routes/doc_cliente/Doc_cliente');
api.use('/carpeta_documento', Carp_documento);

//RUTAS PARA EL SISTEMA EXTERNO PARA CLIENTE
//login
const Doc_login = require('./routes/sist_ext_doc_cliente/Login');
api.use('/sistema_ext_doc_login', Doc_login);
//archivos
const Doc_archivos = require('./routes/sist_ext_doc_cliente/Documentos');
api.use('/sistema_ext_doc_documentos', Doc_archivos);

const Sistema_Extranet = require('./api/sistema_extranet_cliente/routes')
api.use('/sistema_extranet',Sistema_Extranet)

/*** --------------------- */

/*** PARA RUTAS SISTEMA PEV */
//api.use(process.env.PREFIJO,indexRouter)
const Sector = require('./api/apartado_listas_pev/sectores/routes');
api.use('/sector', Sector);
const Area = require('./api/apartado_listas_pev/areas/routes');
api.use('/area', Area);
const Tarea = require('./api/apartado_listas_pev/tareas/routes');
api.use('/tarea', Tarea);
const Turno = require('./api/apartado_listas_pev/turnos/routes');
api.use('/turno', Turno);
const Turnotarea = require('./api/apartado_listas_pev/turnos_tareas/routes');
api.use('/turno_tarea', Turnotarea);

/*** ---------------------- */


/*** RUTAS PARA CRONOGRAMA */
const Cronograma = require('./api/apartado_cronograma/cronograma/routes')
api.use('/cronograma',Cronograma)

const Checkeo = require('./api/apartado_cronograma/chekeo/routes')
api.use('/checkeo',Checkeo)

/*** --------------------- */

/*** RUTAS PARA Listas PEV Trabajador */
const ListaPevTrabajador = require('./api/apartado_listas_pev/lista_pev_trabajador/router')
api.use('/lista_pev_trabajador',ListaPevTrabajador)


/*** RUTAS PARA LISTAS SUPERVISOR */
const ListaSuperTrabajador = require('./api/apartado_listas_pev/lista_super_trabajador/routes')
api.use('/lista_supervisor',ListaSuperTrabajador)


/*** --------------------- */


/** RUTAS PARA SISTEMA INTRANET */
const AccesoLaboral = require('./api/sistema_intranet/accesos_laborales/routes');
api.use('/acces_laboral', AccesoLaboral);

const ClienteTrabajador = require('./api/sistema_intranet/clientes-trabajador/routes')
api.use('/cliente-trabajador',ClienteTrabajador)

/**+ ----------- */

// app.use('/api-aseo', api);
app.use(process.env.PREFIJO, api);

// const port = process.env.PORT || 3000;
const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`servidor corriendo en el puerto:  ${port}`);
});

/*** RUTAS PARA SOLICITUDES CORREOS CRONOGRAMA */
const Solicitud = require('./api/apartado_doc_cliente/solicitud/routes')
api.use('/solicitud',Solicitud)
/**+ ----------- */


/** FUNCIONES PROGRAMADAS */
const FuncionProgramada = require('./routes/doc_cliente/Funcion_programada');

// Tiene que realizarse 1 vez cada día
cron.schedule('0 18 * * *', async () => {
  await FuncionProgramada.mandarCorreo();
});

// cron.schedule('* * * * *', async () => {
//   await FuncionProgramada.mandarCorreo()
// })

//Se realiza cada lunes a las 7 am
cron.schedule('0 7 * * 1', async () => {
  await FuncionProgramada.vaciar_tabla();
});
