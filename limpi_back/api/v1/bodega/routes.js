/**
 * Router de bodega, montado SOLO bajo /api/v1/bodega (ver index.js).
 * RF-BOD-01 (solicitudes): crear = supervisor (propias) + Admin/Operaciones; gestión = Admin/Operaciones (spec §2.3).
 * RF-BOD-03 (proveedores, órdenes de compra): Admin y Operaciones
 * (el rol "Operaciones" todavía no existe en la BD local: ver services/constantes.js).
 */

const express = require('express');

const router = express.Router();
const { asyncHandler } = require('../../../middleware/errores');
const { autenticarBodega, permitir } = require('../../../middleware/auth-bodega');
const { ROL_BODEGA_ADMIN_NOMBRES } = require('../../../services/bodega/constantes');
const controlador = require('./controlador');

const admin = [autenticarBodega, permitir({ roles: ROL_BODEGA_ADMIN_NOMBRES })];
const supervisorOAdmin = [autenticarBodega, permitir({ roles: ROL_BODEGA_ADMIN_NOMBRES, supervisor: true })];

router.get('/productos/solicitables', supervisorOAdmin, asyncHandler(controlador.productosSolicitables));
router.get('/centros-costo/permitidos', supervisorOAdmin, asyncHandler(controlador.centrosPermitidos));

// Rutas estáticas antes de /solicitudes/:id para que 'mias' no se lea como id.
router.get('/solicitudes/mias', supervisorOAdmin, asyncHandler(controlador.listarMias));
router.get('/solicitudes', admin, asyncHandler(controlador.listar));
router.post('/solicitudes', supervisorOAdmin, asyncHandler(controlador.crear));
router.get('/solicitudes/:id', supervisorOAdmin, asyncHandler(controlador.obtener));
router.patch('/solicitudes/:id/anular', supervisorOAdmin, asyncHandler(controlador.anular));
// Sin cambio de estado manual: PARCIAL/LISTA_ENTREGA los pone el cruce (RF-BOD-02) y ENTREGADA la entrega (RF-BOD-04).

const { autenticar, requerirRol } = require('../../../middleware/auth');
const { ROL_ADMIN_NOMBRES, ROL_OPERACIONES_NOMBRES } = require('../../../services/constantes');
const proveedores = require('./proveedores-controlador');
const ordenesCompra = require('./ordenes-compra-controlador');
const productos = require('./productos-controlador');
const cruce = require('./cruce-controlador');

const ADMIN_Y_OPERACIONES = [autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES.concat(ROL_OPERACIONES_NOMBRES))];

// RF-BOD-02: antes de /solicitudes/:id para que no choque con esa ruta (3 segmentos vs 2).
router.get('/solicitudes/:id/cruce', ADMIN_Y_OPERACIONES, asyncHandler(cruce.obtenerCruce));
router.get('/lista-compra', ADMIN_Y_OPERACIONES, asyncHandler(cruce.listaCompra));

router.get('/proveedores', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.listar));
router.get('/proveedores/:id/productos', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.productos));
router.get('/proveedores/:id', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.obtener));
router.post('/proveedores', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.crear));
router.patch('/proveedores/:id', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.editar));
// Activar/desactivar exige motivo y código por correo. Las rutas antiguas responden 410 con la ruta nueva
// (antes no tenían motivo ni código: dejarlas activas sería un atajo sin trazabilidad).
const rutaReemplazada = (req, res) => res.status(410).json({ ok: false, error: {
  code: 'RUTA_REEMPLAZADA',
  message: 'para activar o desactivar un proveedor usa POST /proveedores/:id/estado/codigo { activo, motivo } y luego POST /proveedores/:id/estado { activo, codigo }',
  details: { codigo: 'POST /api/v1/bodega/proveedores/:id/estado/codigo', confirmar: 'POST /api/v1/bodega/proveedores/:id/estado' }
} });
router.delete('/proveedores/:id', ADMIN_Y_OPERACIONES, rutaReemplazada);
router.patch('/proveedores/:id/reactivar', ADMIN_Y_OPERACIONES, rutaReemplazada);
router.post('/proveedores/:id/estado/codigo', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.pedirCodigoEstado));
router.post('/proveedores/:id/estado', ADMIN_Y_OPERACIONES, asyncHandler(proveedores.cambiarEstado));

router.patch('/productos/:id/proveedor', ADMIN_Y_OPERACIONES, asyncHandler(productos.asignarProveedor));

router.post('/ordenes-compra', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.crear));
router.get('/ordenes-compra/:id', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.obtener));
router.patch('/ordenes-compra/:id', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.actualizar));
router.post('/ordenes-compra/:id/enviar', ADMIN_Y_OPERACIONES, asyncHandler(ordenesCompra.enviar));
router.post('/ordenes-compra/desde-lista', ADMIN_Y_OPERACIONES, asyncHandler(cruce.generarDesdeLista));

// RF-BOD-04: recepción, entrega, formato de entrega y movimientos (Admin y Operaciones).
const recepcionBodega = require('./recepcion-controlador');
router.post('/ordenes-compra/:id/recepcion', admin, asyncHandler(recepcionBodega.recibir));
router.post('/solicitudes/:id/entregar', admin, asyncHandler(recepcionBodega.entregar));
router.get('/solicitudes/:id/formato-entrega', admin, asyncHandler(recepcionBodega.formatoEntrega));
router.get('/movimientos', admin, asyncHandler(recepcionBodega.listarMovimientos));
router.get('/productos/:id/kardex', admin, asyncHandler(recepcionBodega.kardexProducto));
router.get('/ordenes-compra', admin, asyncHandler(recepcionBodega.listarOrdenes));
router.get('/ordenes-compra/:id/recepcion', admin, asyncHandler(recepcionBodega.detalleRecepcion));

// RF-BOD-05: dashboard de bodega y stock mínimo (Admin y Operaciones).
const dashboardBodega = require('./dashboard-controlador');
router.get('/dashboard', admin, asyncHandler(dashboardBodega.obtener));
router.patch('/productos/:id/stock-minimo', admin, asyncHandler(dashboardBodega.actualizarStockMinimo));

// RNF-ARQ-01 parte 1 (SCRUM-42): equivalentes v1 de /producto/* (Admin y Operaciones). Docs/MIGRACION_RUTAS.md.
const productosCrud = require('./productos-crud-controlador');
router.get('/productos', ADMIN_Y_OPERACIONES, asyncHandler(productosCrud.listar));
router.post('/productos', ADMIN_Y_OPERACIONES, asyncHandler(productosCrud.crear));
router.put('/productos/:id', ADMIN_Y_OPERACIONES, asyncHandler(productosCrud.editar));
router.patch('/productos/:id/estado', ADMIN_Y_OPERACIONES, asyncHandler(productosCrud.cambiarEstado));
router.delete('/productos/:id', ADMIN_Y_OPERACIONES, asyncHandler(productosCrud.borrar));
// Equivalentes v1 de /stock/obtener y /stock/crear.
const stockRapido = require('./stock-rapido-controlador');
router.get('/stock-rapido', ADMIN_Y_OPERACIONES, asyncHandler(stockRapido.listar));
router.post('/stock-rapido', ADMIN_Y_OPERACIONES, asyncHandler(stockRapido.crear));
// Cierre D-ARQ-01-1: anular (REVERSA en kardex) en vez del borrado físico del legacy.
router.patch('/stock-rapido/:id/anular', ADMIN_Y_OPERACIONES, asyncHandler(require('./stock-rapido-anular-controlador').anular));

// RF-BOD-07: conteo físico. Captura = Admin y Operaciones; aprobar (genera AJUSTE en el kardex) = solo Admin.
const conteos = require('./conteos-controlador');
const soloAdmin = [autenticarBodega, permitir({ roles: ROL_ADMIN_NOMBRES })];
router.get('/conteos', admin, asyncHandler(conteos.listar));
router.post('/conteos', admin, asyncHandler(conteos.crear));
router.get('/conteos/:id', admin, asyncHandler(conteos.obtener));
router.patch('/conteos/:id/items', admin, asyncHandler(conteos.capturar));
router.patch('/conteos/:id/anular', admin, asyncHandler(conteos.anular));
router.post('/conteos/:id/aprobar', soloAdmin, asyncHandler(conteos.aprobar));

module.exports = router;
