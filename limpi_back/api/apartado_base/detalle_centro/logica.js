const Lista_insumo = require('../../../modelos/sistema_base/Lista_insumo')
const Linea_insumo = require('../../../modelos/sistema_base/Linea_insumo')
const Ccegreso = require('../../../modelos/sistema_base/CcEgreso')
const Ccingreso = require('../../../modelos/sistema_base/CcIngreso')
const Centro_trabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore')
const Producto = require('../../../modelos/sistema_base/Producto')
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo')
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion')

//RELACIONES 1-1 *-* 1-*
Lista_insumo.hasMany(Linea_insumo);
Linea_insumo.belongsTo(Producto);

const aumentarCantidadProductoDB = async (id, cantidad) => {
    let respuesta = await Producto.increment('stock', {
        by: cantidad,
        where: { id }
    });
    return respuesta
}

const disminuirCantidadProductoDB = async (id, cantidad) => {
    let respuesta = await Producto.decrement('stock', {
        by: cantidad,
        where: { id }
    });
    return respuesta
}

const crearCentroTrabajadorDB = async (asociacion) => {
    let respuesta = await Centro_trabajador.create(asociacion)
    return respuesta
}

const obtenerCentroTrabajadorIdDB = async (id) => {
    let respuesta = await Centro_trabajador.findById(id)
    return respuesta
}

const eliminarCentroTrabajadorDB = async (id) => {
    let respuesta = await Centro_trabajador.destroy({ where: { id } })
    return respuesta
}

const eliminarLiquidacionDB = async (id) => {
    let respuesta = await Liquidacion.destroy({
        where: { id }
    });
    return respuesta
}

const crearListaInsumoDB = async (lista_insumo) => {
    let respuesta = await Lista_insumo.create(lista_insumo)
    return respuesta
}

const aprobarListaInsumoDB = async (id, id_usuario) => {
    let respuesta = await Lista_insumo.update({ estado: 1, usuarioApruebaId: id_usuario }, { where: { id } })
    return respuesta
}

const eliminarListaInsumoDB = async (id) => {
    let respuesta = await Lista_insumo.destroy({ where: { id } })
    return respuesta
}

const crearLineaInsumoDB = async (linea_insumo) => {
    let respuesta = await Linea_insumo.create(linea_insumo)
    return respuesta
}

const obtenerLineasInsumoDB = async (id_lista_insumo) => {
    let respuesta = await Linea_insumo.findAll({
        where: { listaInsumoId: id_lista_insumo }
    })
    return respuesta
}

const eliminarLineaInsumoDB = async (id_lista_insumo) => {
    let respuesta = await Linea_insumo.destroy({ where: { listaInsumoId: id_lista_insumo } })
    return respuesta
}

const crearCCEgresoDB = async (egreso) => {
    let respuesta = await Ccegreso.create(egreso)
    return respuesta
}

const eliminarCCEgresoDB = async (id) => {
    let respuesta = await Ccegreso.destroy({
        where: { id }
    })
    return respuesta
}

const crearCCIngresoDB = async (ingreso) => {
    let respuesta = await Ccingreso.create(ingreso)
    return respuesta
}

const eliminarCCIngresoDB = async (id) => {
    let respuesta = await Ccingreso.destroy({
        where: { id }
    })
    return respuesta
}

const obtenerCCIngresoIdDB = async (id) => {
    let respuesta = await Ccingreso.findById(id)
    return respuesta
}

const aumentarPrecioServicioCentroCostoDB = async (id, precio_servicio) => {
    let respuesta = await CentroCosto.increment('precio_servicio', {
        by: precio_servicio,
        where: { id }
    });
    return respuesta
}

const disminuirPrecioServicioCentroCostoDB = async (id, precio_servicio) => {
    let respuesta = await CentroCosto.decrement('precio_servicio', {
        by: precio_servicio,
        where: { id }
    });
    return respuesta
}


module.exports = {
    aumentarCantidadProductoDB,
    disminuirCantidadProductoDB,
    crearCentroTrabajadorDB,
    obtenerCentroTrabajadorIdDB,
    eliminarCentroTrabajadorDB,
    eliminarLiquidacionDB,
    crearListaInsumoDB,
    crearLineaInsumoDB,
    aprobarListaInsumoDB,
    obtenerLineasInsumoDB,
    eliminarListaInsumoDB,
    eliminarLineaInsumoDB,
    crearCCEgresoDB,
    eliminarCCEgresoDB,
    crearCCIngresoDB,
    eliminarCCIngresoDB,
    obtenerCCIngresoIdDB,
    aumentarCantidadProductoDB,
    disminuirCantidadProductoDB,
    aumentarPrecioServicioCentroCostoDB,
    disminuirPrecioServicioCentroCostoDB
}