const express = require('express')
const router = express.Router()
const controlador = require('./controlador')
const multer = require('../../libs/multer-categoria');
const multer_extra = require('../../libs/multer-extra')

router.post('/crear',multer.single('image'),controlador.crearCateServicio)
router.put('/editar/:idCate_servicio',multer.single('image'), controlador.editarCateServicio)
router.get('/obtener-cate-servicio/:idCate_servicio',controlador.obtenerCateServicioId)
router.delete('/desactivar-cate/:idCate_servicio', controlador.desactivarCateServicio)
router.delete('/activar-cate/:idCate_servicio',controlador.activarCateServicio)
router.get('/obtener-cate-serv-activos',controlador.obtenerCateServiciosActivos)
router.get('/obtener-cate-serv-inactivos',controlador.obtenerCateServiciosInactivos)

router.put('/editar-descripcion/:idDescripcion',controlador.editarDescripcion)
router.put('/editar-herramienta/:idHerramienta',controlador.editarHerramienta)
router.put('/editar-articulo/:idArticulo',controlador.editarArticulo)
router.delete('/eliminar-descripcion/:idDescripcion', controlador.eliminarDescripcion)
router.delete('/eliminar-herramienta/:idHerramienta', controlador.eliminarHerramienta)
router.delete('/eliminar-articulo/:idArticulo', controlador.eliminarArticulo)

router.post('/crear-img-extra',multer_extra.single('image'),controlador.crearImgExtra)
router.put('/editar-img-extra/:idImg',multer_extra.single('imagen'),controlador.editarImgExtra)
router.get('/obtener-img-extra/:idImg',controlador.obtenerImgExtra)

module.exports = router