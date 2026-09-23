const { Op } = require('sequelize')

const Cate_servicio = require('../../../modelos/sist_app/Categoria_servicio');
const Horario = require('../../../modelos/sist_app/Horario');

//MODELOS PERTENECIENTES A Categoria servicio
const Descripcion = require('../../../modelos/sist_app/Descripcion');
const Herramienta = require('../../../modelos/sist_app/Herramienta');
const Articulo = require('../../../modelos/sist_app/Articulo');
const Servicio = require('../../../modelos/sist_app/Servicio');
const Bloque = require('../../../modelos/sist_app/Bloque');
const Img_extra = require('../../../modelos/sist_app/Img_extra')
const Dia = require('../../../modelos/sist_app/Dia')

//ASOCIACIONES
Cate_servicio.hasOne(Horario);
Cate_servicio.hasMany(Descripcion);
Cate_servicio.hasMany(Herramienta);
Cate_servicio.hasMany(Articulo);
Cate_servicio.hasMany(Servicio);
Cate_servicio.hasOne(Img_extra);
Horario.hasMany(Dia);

const buscarCateServicioNombreDB = async(nombre) => {
    let respuesta = await Cate_servicio.findOne({where:{nombre}})
    return respuesta
}

const crearCateServicioDB = async(cateServicio) => {
    let respuesta = await Cate_servicio.create(cateServicio)
    return respuesta
}

const crearDescripcionDB = async(descripcion,t) => {
    let respuesta = await Descripcion.create(descripcion,{transaction:t})
    return respuesta
}

const crearHerramientaDB = async(herramienta,t) => {
    let respuesta = await Herramienta.create(herramienta,{transaction:t})
    return respuesta
}

const crearArticuloDB = async(articulo,t) => {
    let respuesta = await Articulo.create(articulo,{transaction:t})
    return respuesta
}

const buscarCateServicioIdDB = async(id) => {
    let respuesta = await Cate_servicio.findById(id)
    return respuesta
}

const editarCateServicioDB = async(cateServicio,id) => {
    let respuesta = await Cate_servicio.update(cateServicio,{where:{id}})
}

const obtenerCateServicioIdDB = async(id) => {
    let respuesta = await Cate_servicio.findById(id, {
        include: [{ model: Horario,include:[{model:Dia, include: [Bloque]}] } , { model: Descripcion }, { model: Herramienta }, { model: Articulo },{model:Img_extra}]
      })
    return respuesta
}

const desactivarCateServicioDB = async(id) => {
    let respuesta = await Cate_servicio.update({estado:0},{where:{id}})
    return respuesta
}

const activarCateServicioDB = async(id) => {
    let respuesta = await Cate_servicio.update({estado:1},{where:{id}})
    return respuesta
}

const obtenerCateServiciosActivosDB = async(id) => {
    let respuesta = await Cate_servicio.findAll({where:{estado:1}})
    return respuesta
}

const obtenerCateServiciosInactivosDB = async(id) => {
    let respuesta = await Cate_servicio.findAll({where:{estado:0}})
    return respuesta
}

/** EDITAR Y ELIMINAR,  DESCRIPCION, HERRAMIENTA Y ARTICULO  */

const editarDescripcionDB = async(descripcion,id) => {
    let respuesta = await Descripcion.update(descripcion,{where:{id}})
    return respuesta
}

const editarHerramientaDB = async(herramienta,id) => {
    let respuesta = await Herramienta.update(herramienta,{where:{id}})
    return respuesta
}

const editarArticuloDB = async(articulo,id) => {
    let respuesta = await Articulo.update(articulo,{where:{id}})
    return respuesta
}

const eliminarDescripcionDB = async(id) => {
    let respuesta = await Descripcion.destroy({where:{id}})
    return respuesta
}

const eliminarHerramientaDB = async(id) => {
    let respuesta = await Herramienta.destroy({where:{id}})
    return respuesta
}

const eliminarArticuloDB = async(id) => {
    let respuesta = await Articulo.destroy({where:{id}})
    return respuesta
}

/** APARTADO DE IMG_EXTRA */

const crearImgExtraDB = async(img) => {
    let respuesta = await Img_extra.create(img)
    return respuesta
}

const buscarImgExtraIdDB = async(id) => {
    let respuesta = await Img_extra.findById(id)
    return respuesta
}

const editarImgExtraDB = async(img,id) => {
    let respuesta = await Img_extra.update(img,{where:{id}})
    return respuesta
}


module.exports = {
    buscarCateServicioNombreDB,
    crearCateServicioDB,
    crearDescripcionDB,
    crearHerramientaDB,
    crearArticuloDB,
    buscarCateServicioIdDB,
    editarCateServicioDB,
    obtenerCateServicioIdDB,
    desactivarCateServicioDB,
    activarCateServicioDB,
    obtenerCateServiciosActivosDB,
    obtenerCateServiciosInactivosDB,
    editarDescripcionDB,
    editarHerramientaDB,
    editarArticuloDB,
    eliminarDescripcionDB,
    eliminarHerramientaDB,
    eliminarArticuloDB,
    crearImgExtraDB,
    buscarImgExtraIdDB,
    editarImgExtraDB
}