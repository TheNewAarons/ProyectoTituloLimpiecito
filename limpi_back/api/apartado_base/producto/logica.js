const Producto = require('../../../modelos/sistema_base/Producto')

const { Op } = require('sequelize')

const crearProductoDB = async(producto) => {
    let respuesta = await Producto.create(producto)
    return respuesta
}

const buscarProductoNombreDB = async(nombre) => {
    let respuesta = await Producto.findOne({where:{nombre,estado:{[Op.ne]:2}}})
    return respuesta
}

const editarProductoDB = async(id,producto) => {
    let respuesta = await Producto.update(producto,{where:{id}})
    return respuesta
}

const buscarProductoIdDB = async(id) => {
    let respuesta = await Producto.findById(id)
    return respuesta
}

const desactivarProductoDB = async(id) => {
    let respuesta = await Producto.update({estado:0},{where:{id}})
    return respuesta
}

const activarProductoDB = async(id) => {
    let respuesta = await Producto.update({estado:1},{where:{id}})
    return respuesta
}

const borrarProductoDB = async(id) => {
    let respuesta = await Producto.update({estado:2},{where:{id}})
    return respuesta
}

const obtenerProductosActivosDB = async(id) => {
    let respuesta = await Producto.findAll({
        where: { estado: 1 },
        order: [['id', 'DESC']]
        })
    return respuesta
}

const obtenerProductosInactivosDB = async(id) => {
    let respuesta = await Producto.findAll({
        where: { estado: 0 },
        order: [['id', 'DESC']]
        })
    return respuesta
}

//obtener producto estado activo y stock > 0
const obtenerProductosActivosConStockDB = async() => {
    let respuesta = await Producto.findAll({
        where: { estado: 1, stock: {[Op.gt]: 0} },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const obtenerTodosProductosDB = async() => {
    let respuesta = await Producto.findAll({
        order: [['id', 'DESC']]
      })
    return respuesta
}

const buscarProductosActivosDB = async(busca) => {
    let respuesta = await Producto.findAll({
        where: {
          estado: 1,
          [Op.or]: [
            { nombre: { [Op.like]: '%' + busca + '%' }},
            { precio: { [Op.like]: '%' + busca + '%' }},
            { stock: { [Op.like]: '%' + busca + '%' }}
          ]
        },
        order: [['id', 'DESC']]
      })
    return respuesta
}

const buscarProductosInactivosDB = async(busca) => {
    let respuesta = await Producto.findAll({
        where: {
          estado: 0,
          [Op.or]: [
            { nombre: { [Op.like]: '%' + busca + '%' } },
            { precio: { [Op.like]: '%' + busca + '%' } },
            { stock: { [Op.like]: '%' + busca + '%' } }
          ]
        },
        order: [['id', 'DESC']]
      })
    return respuesta
}

module.exports = {
    crearProductoDB,
    buscarProductoNombreDB,
    editarProductoDB,
    buscarProductoIdDB,
    activarProductoDB,
    desactivarProductoDB,
    obtenerProductosActivosDB,
    obtenerProductosInactivosDB,
    obtenerProductosActivosConStockDB,
    obtenerTodosProductosDB,
    buscarProductosActivosDB,
    buscarProductosInactivosDB,
    borrarProductoDB
}
