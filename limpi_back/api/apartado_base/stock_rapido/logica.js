const Stock = require('../../../modelos/sistema_base/Stock_rapido')
const Producto = require('../../../modelos/sistema_base/Producto')

//RELACIONES 1-1 *-* 1-*
Stock.belongsTo(Producto, { as: 'producto' });

/** PERTENECE A PRODUCTO */

const aumentarCantidadProductoDB = async(id,cantidad) => {
    let respuesta = await Producto.increment('stock', {
        by:cantidad,
        where: {id}
      });
    return respuesta
}

const disminuirCantidadProductoDB = async(id,cantidad) => {
    let respuesta = await Producto.decrement('stock', {
        by:cantidad,
        where: {id}
      });
    return respuesta
}

const crearStockDB = async(stock) => {
    let respuesta = await Stock.create(stock)
    return respuesta
}

const buscarStockIdDB = async(id) => {
    let respuesta = await Stock.findById(id)
    return respuesta
}

const eliminarStockDB = async(id) => {
    let respuesta = await Stock.destroy({ where: { id } })
    return respuesta
}

const obtenerTodosStockDB = async() => {
    let respuesta = await Stock.findAll({
        include: {
          model: Producto,
          as: 'producto'
        },
        order: [['id', 'DESC']]
      })
    return respuesta
}

module.exports = {
    aumentarCantidadProductoDB,
    disminuirCantidadProductoDB,
    crearStockDB,
    buscarStockIdDB,
    eliminarStockDB,
    obtenerTodosStockDB
}