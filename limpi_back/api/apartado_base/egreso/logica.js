const Caja = require('../../../modelos/sistema_base/Caja')
const Usuario = require('../../../modelos/sistema_base/Usuario')
const Egreso = require('../../../modelos/sistema_base/Egreso')

Egreso.belongsTo(Caja);
Egreso.belongsTo(Usuario);

const crearEgresoDB = async(egreso) => {
    let respuesta = await Egreso.create(egreso)
    return respuesta
}

const eliminarEgresoDB = async(id) => {
    let respuesta = await Egreso.destroy({ where: { id } })
    return respuesta
}

const obtenerTodosEgresosDB = async() => {
    let respuesta = await Egreso.findAll({
        include: [
          { model: Caja },
          { model: Usuario }
        ]
      })
    return respuesta
}

const obtenerEgresosCajaDB = async(id) => {
    let respuesta = await Egreso.findAll({
        include: [
          { model: Caja },
          { model: Usuario }
        ],
        where: { cajaId: id }
      })
    return respuesta
}

module.exports = {
    crearEgresoDB,
    eliminarEgresoDB,
    obtenerTodosEgresosDB,
    obtenerEgresosCajaDB
}