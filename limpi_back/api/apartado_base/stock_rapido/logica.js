const Stock = require('../../../modelos/sistema_base/Stock_rapido')
const Producto = require('../../../modelos/sistema_base/Producto')

//RELACIONES 1-1 *-* 1-*
Stock.belongsTo(Producto, { as: 'producto' });

/** PERTENECE A PRODUCTO */

const crearStockDB = async(stock,t) => {
    let respuesta = await Stock.create(stock, { transaction: t })
    return respuesta
}

const buscarStockIdDB = async(id,t) => {
    let respuesta = await Stock.findById(id, { transaction: t })
    return respuesta
}

const eliminarStockDB = async(id,t) => {
    let respuesta = await Stock.destroy({ where: { id }, transaction: t })
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
    crearStockDB,
    buscarStockIdDB,
    eliminarStockDB,
    obtenerTodosStockDB
}
