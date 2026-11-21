const Lista_insumo = require('../../../modelos/sistema_base/Lista_insumo')
const Linea_insumo = require('../../../modelos/sistema_base/Linea_insumo')
const Ccegreso = require('../../../modelos/sistema_base/CcEgreso')
const Ccingreso = require('../../../modelos/sistema_base/CcIngreso')
const Centro_trabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore')
const Producto = require('../../../modelos/sistema_base/Producto')
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo')
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion')
const db = require('../../../database/database')
const { auditar } = require('../../../services/auditoria')
const kardex = require('../../../services/bodega/kardex')
const Movimiento = require('../../../modelos/sistema_bodega/Movimiento_bodega')
const { TIPOS_MOVIMIENTO: M } = require('../../../services/bodega/constantes')

//RELACIONES 1-1 *-* 1-*
Lista_insumo.hasMany(Linea_insumo);
Linea_insumo.belongsTo(Producto);

// RNF-SEC-02: motivo de las anulaciones por borrado fisico legacy (D-075).
const MOTIVO_BORRADO = 'BORRADO_FISICO_LEGACY'

const crearCentroTrabajadorDB = async (asociacion) => {
    let respuesta = await Centro_trabajador.create(asociacion)
    return respuesta
}

const obtenerCentroTrabajadorIdDB = async (id) => {
    let respuesta = await Centro_trabajador.findById(id)
    return respuesta
}

const eliminarCentroTrabajadorDB = async (id, t) => {
    let respuesta = await Centro_trabajador.destroy({ where: { id }, transaction: t })
    return respuesta
}

const eliminarLiquidacionDB = async (id, t) => {
    let respuesta = await Liquidacion.destroy({
        where: { id },
        transaction: t
    });
    return respuesta
}

// L5: borra la asociacion centro-trabajador y la liquidacion asociada (mismo criterio de borrado
// por id que eliminarLiquidacionDB) dentro de una unica transaccion, auditando la liquidacion
// realmente borrada. H-SEC-07: el controlador sigue pasando req.params.id (no se corrige aqui).
const eliminarAsociacionCentroTrabajadorDB = async (id, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = [MOTIVO_BORRADO, contexto.motivoSinToken].filter(Boolean).join(' ') || null
    return db.sequelize.transaction(async (t) => {
        const liquidacion = await Liquidacion.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (liquidacion) {
            const antes = liquidacion.get({ plain: true })
            await auditar({
                transaction: t,
                usuario,
                entidad: 'liquidaciones',
                entidad_id: id,
                accion: 'ANULAR',
                antes,
                motivo,
                ip: contexto.ip
            })
        }
        await eliminarLiquidacionDB(id, t)
        const eliminado = await eliminarCentroTrabajadorDB(id, t)
        return eliminado
    })
}

const crearListaInsumoDB = async (lista_insumo) => {
    let respuesta = await Lista_insumo.create(lista_insumo)
    return respuesta
}

const aprobarListaInsumoDB = async (id, id_usuario, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const existente = await Lista_insumo.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (!existente) {
            return Lista_insumo.update({ estado: 1, usuarioApruebaId: id_usuario }, { where: { id }, transaction: t })
        }
        const antes = existente.get({ plain: true })
        const actualizadas = await Lista_insumo.update({ estado: 1, usuarioApruebaId: id_usuario }, { where: { id }, transaction: t })
        const despues = await Lista_insumo.findById(id, { transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'lista_insumos',
            entidad_id: id,
            accion: 'EDITAR',
            antes,
            despues,
            motivo,
            ip: contexto.ip
        })
        return actualizadas
    })
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

// B10: bloquea los productos en orden id ASC antes de mover stock para evitar deadlocks.
// Devuelve las instancias bloqueadas por id para moverlas con el kardex (RF-BOD-06).
const bloquearProductosDB = async (idsProductos, t) => {
    const porId = {}
    if (idsProductos.length) {
        const filas = await Producto.findAll({
            where: { id: idsProductos },
            transaction: t,
            lock: t.LOCK.UPDATE,
            order: [['id', 'ASC']]
        })
        filas.forEach((p) => { porId[p.id] = p })
    }
    return porId
}

// B10 crear: crea la lista y sus lineas, descuenta stock de los productos y audita CREAR.
const crearListaInsumoCompletoDB = async (listaData, lineasInsumos, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const lista = await Lista_insumo.create(listaData, { transaction: t })
        const idsProductos = lineasInsumos.map((l) => l.productoId).sort((a, b) => a - b)
        const productos = await bloquearProductosDB(idsProductos, t)
        const lineas = []
        for (let i = 0; i < lineasInsumos.length; i++) {
            const linea = lineasInsumos[i]
            const creada = await Linea_insumo.create({
                cantidad: linea.cantidad,
                precio: linea.precio,
                total_linea: linea.total_linea,
                listaInsumoId: lista.id,
                productoId: linea.productoId
            }, { transaction: t })
            if (!productos[linea.productoId]) throw new Error('PRODUCTO_NO_EXISTE: ' + linea.productoId)
            await kardex.registrar({
                transaction: t, producto: productos[linea.productoId], tipo: M.SALIDA_SOLICITUD, cantidad: -Number(linea.cantidad),
                referenciaTipo: 'lista_insumos', referenciaId: lista.id, referenciaLineaId: creada.id, usuario: usuario
            })
            lineas.push(creada && creada.get ? creada.get({ plain: true }) : creada)
        }
        const despues = Object.assign({}, lista && lista.get ? lista.get({ plain: true }) : lista, { lineas: lineas })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'lista_insumos',
            entidad_id: lista.id,
            accion: 'CREAR',
            despues,
            motivo,
            ip: contexto.ip
        })
        return lista
    })
}

// B10 eliminar: audita ANULAR antes de borrar, devuelve stock y borra lineas y lista.
const eliminarListaInsumoCompletoDB = async (id, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = [MOTIVO_BORRADO, contexto.motivoSinToken].filter(Boolean).join(' ') || null
    return db.sequelize.transaction(async (t) => {
        const lista = await Lista_insumo.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        const lineas = await Linea_insumo.findAll({ where: { listaInsumoId: id }, transaction: t })
        if (lista) {
            const antes = Object.assign({}, lista.get({ plain: true }), {
                lineas: lineas.map((l) => (l && l.get ? l.get({ plain: true }) : l))
            })
            await auditar({
                transaction: t,
                usuario,
                entidad: 'lista_insumos',
                entidad_id: id,
                accion: 'ANULAR',
                antes,
                motivo,
                ip: contexto.ip
            })
        }
        const idsProductos = lineas.map((l) => l.productoId).sort((a, b) => a - b)
        const productos = await bloquearProductosDB(idsProductos, t)
        // RF-BOD-06: repone cada línea con su salida original y su mismo valor; sin salida registrada, a costo promedio
        const salidas = await Movimiento.findAll({
            where: { tipo: M.SALIDA_SOLICITUD, referencia_tipo: 'lista_insumos', referencia_id: id }, transaction: t
        })
        for (let i = 0; i < lineas.length; i++) {
            const producto = productos[lineas[i].productoId]
            if (!producto || !Number(lineas[i].cantidad)) continue
            const original = salidas.find((s) => s.referencia_linea_id === lineas[i].id && Number(s.cantidad) === -Number(lineas[i].cantidad))
            await kardex.registrar({
                transaction: t, producto: producto, tipo: M.REVERSA, cantidad: Number(lineas[i].cantidad), revierte: original,
                referenciaTipo: 'lista_insumos', referenciaId: id, referenciaLineaId: lineas[i].id, motivo: 'Eliminación de lista de insumos', usuario: usuario
            })
        }
        await Linea_insumo.destroy({ where: { listaInsumoId: id }, transaction: t })
        const numero_eliminado = await Lista_insumo.destroy({ where: { id }, transaction: t })
        return numero_eliminado
    })
}

const crearCCEgresoDB = async (egreso, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const creado = await Ccegreso.create(egreso, { transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cc_egresos',
            entidad_id: creado.id,
            accion: 'CREAR',
            despues: creado,
            motivo,
            ip: contexto.ip
        })
        return creado
    })
}

const eliminarCCEgresoDB = async (id, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = [MOTIVO_BORRADO, contexto.motivoSinToken].filter(Boolean).join(' ') || null
    return db.sequelize.transaction(async (t) => {
        const fila = await Ccegreso.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (!fila) return 0
        const antes = fila.get({ plain: true })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cc_egresos',
            entidad_id: id,
            accion: 'ANULAR',
            antes,
            motivo,
            ip: contexto.ip
        })
        const eliminado = await Ccegreso.destroy({ where: { id }, transaction: t })
        return eliminado
    })
}

const crearCCIngresoDB = async (ingreso, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = contexto.motivoSinToken || null
    return db.sequelize.transaction(async (t) => {
        const creado = await Ccingreso.create(ingreso, { transaction: t })
        await CentroCosto.increment('precio_servicio', { by: ingreso.monto, where: { id: ingreso.centroCostoId }, transaction: t })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cc_ingresos',
            entidad_id: creado.id,
            accion: 'CREAR',
            despues: creado,
            motivo,
            ip: contexto.ip
        })
        return creado
    })
}

const eliminarCCIngresoDB = async (id, ctx) => {
    const contexto = ctx || {}
    const usuario = contexto.usuario || { id: null, contexto: 'sistema' }
    const motivo = [MOTIVO_BORRADO, contexto.motivoSinToken].filter(Boolean).join(' ') || null
    return db.sequelize.transaction(async (t) => {
        const fila = await Ccingreso.findById(id, { transaction: t, lock: t.LOCK.UPDATE })
        if (!fila) return 0
        const antes = fila.get({ plain: true })
        await auditar({
            transaction: t,
            usuario,
            entidad: 'cc_ingresos',
            entidad_id: id,
            accion: 'ANULAR',
            antes,
            motivo,
            ip: contexto.ip
        })
        const eliminado = await Ccingreso.destroy({ where: { id }, transaction: t })
        await CentroCosto.decrement('precio_servicio', { by: antes.monto, where: { id: antes.centroCostoId }, transaction: t })
        return eliminado
    })
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
    crearCentroTrabajadorDB,
    obtenerCentroTrabajadorIdDB,
    eliminarCentroTrabajadorDB,
    eliminarLiquidacionDB,
    eliminarAsociacionCentroTrabajadorDB,
    crearListaInsumoDB,
    crearLineaInsumoDB,
    aprobarListaInsumoDB,
    obtenerLineasInsumoDB,
    eliminarListaInsumoDB,
    eliminarLineaInsumoDB,
    crearListaInsumoCompletoDB,
    eliminarListaInsumoCompletoDB,
    crearCCEgresoDB,
    eliminarCCEgresoDB,
    crearCCIngresoDB,
    eliminarCCIngresoDB,
    obtenerCCIngresoIdDB,
    aumentarPrecioServicioCentroCostoDB,
    disminuirPrecioServicioCentroCostoDB
}