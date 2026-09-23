const logicaDB = require('./logica')

const crearLiquidacion = async (req, res) => {
    const liquidacion = JSON.parse(req.body.liquidacion);
    const liquidacionData = {
        // id: liquidacion.id,
        sueldo_base: liquidacion.sueldo_base,
        monto_mes: liquidacion.monto_mes,
        cant_horas_extras: liquidacion.cant_horas_extras,
        valor_horas_extras: liquidacion.valor_horas_extras,
        porcentaje_gratificacion: liquidacion.porcentaje_gratificacion,
        gratificacion: liquidacion.gratificacion,
        reajuste_retroactivo: liquidacion.reajuste_retroactivo,
        monto_indemnizacion: liquidacion.monto_indemnizacion,
        bono_indemnizacion: liquidacion.bono_indemnizacion,
        valor_movilizacion: liquidacion.valor_movilizacion,
        movilizacion: liquidacion.movilizacion,
        colacion: liquidacion.colacion,
        monto_produccion: liquidacion.monto_produccion,
        bono_produccion: liquidacion.bono_produccion,
        dias_trabajados: liquidacion.dias_trabajados,
        monto_responsabilidad: liquidacion.monto_responsabilidad,
        bono_responsabilidad: liquidacion.bono_responsabilidad,
        total_haber: liquidacion.total_haber,
        total_imponible: liquidacion.total_imponible,
        cotizacion_obligatoria: liquidacion.cotizacion_obligatoria,
        salud: liquidacion.salud,
        seguro_cesantia: liquidacion.seguro_cesantia,
        total_descuento: liquidacion.total_descuento,
        anticipo: liquidacion.anticipo,
        liquido_pagar: liquidacion.liquido_pagar,
        hora_faltante: liquidacion.hora_faltante,
        valor_hora_faltante: liquidacion.valor_hora_faltante,
        cant_familiar: liquidacion.cant_familiar,
        valor_carga_familiar: liquidacion.valor_carga_familiar,
        fecha_creacion: new Date(liquidacion.fecha_creacion),
        //descuento_accion: liquidacion.descuento_accion,
        horas_feriado: liquidacion.horas_feriado,
        valor_hora_feriado: liquidacion.valor_hora_feriado,
        total_pago: liquidacion.total_pago,
        alimentacion: liquidacion.alimentacion,
        tipo_trabajador: liquidacion.tipo_trabajador,
        estado: liquidacion.estado
        // trabajadoreId: liquidacion.trabajadoreId,
        // centroCostoId: liquidacion.centroCostoId
        //centroCostoTrabajadoreId: liquidacion.centroCostoTrabajadoreId,
    };
    try {
        let liquidacion_creado = await logicaDB.crearLiquidacionDB(liquidacionData)
        // console.log(liquidacion)
        await logicaDB.editarCentroTrabajadorDB(liquidacion_creado.id,req.params.idCentroTrabajador)
        return res.json({ liquidacion })

    } catch (error) {
        return res.send('error'+error)
    }
}

const editarLiquidacion = async (req, res) => {
    const liquidacion = JSON.parse(req.body.liquidacion);
    const liquidacionData = {
        sueldo_base: liquidacion.sueldo_base,
        monto_mes: liquidacion.monto_mes,
        cant_horas_extras: liquidacion.cant_horas_extras,
        valor_horas_extras: liquidacion.valor_horas_extras,
        porcentaje_gratificacion: liquidacion.porcentaje_gratificacion,
        gratificacion: liquidacion.gratificacion,
        reajuste_retroactivo: liquidacion.reajuste_retroactivo,
        monto_indemnizacion: liquidacion.monto_indemnizacion,
        bono_indemnizacion: liquidacion.bono_indemnizacion,
        valor_movilizacion: liquidacion.valor_movilizacion,
        movilizacion: liquidacion.movilizacion,
        colacion: liquidacion.colacion,
        monto_produccion: liquidacion.monto_produccion,
        bono_produccion: liquidacion.bono_produccion,
        dias_trabajados: liquidacion.dias_trabajados,
        monto_responsabilidad: liquidacion.monto_responsabilidad,
        bono_responsabilidad: liquidacion.bono_responsabilidad,
        total_haber: liquidacion.total_haber,
        total_imponible: liquidacion.total_imponible,
        cotizacion_obligatoria: liquidacion.cotizacion_obligatoria,
        salud: liquidacion.salud,
        seguro_cesantia: liquidacion.seguro_cesantia,
        total_descuento: liquidacion.total_descuento,
        anticipo: liquidacion.anticipo,
        liquido_pagar: liquidacion.liquido_pagar,
        hora_faltante: liquidacion.hora_faltante,
        valor_hora_faltante: liquidacion.valor_hora_faltante,
        cant_familiar: liquidacion.cant_familiar,
        valor_carga_familiar: liquidacion.valor_carga_familiar,
        fecha_creacion: new Date(liquidacion.fecha_creacion),
        //descuento_accion: liquidacion.descuento_accion,
        horas_feriado: liquidacion.horas_feriado,
        valor_hora_feriado: liquidacion.valor_hora_feriado,
        total_pago: liquidacion.total_pago,
        alimentacion: liquidacion.alimentacion,
        tipo_trabajador: liquidacion.tipo_trabajador,
        estado: liquidacion.estado
        // trabajadoreId: liquidacion.trabajadoreId,
        // centroCostoId: liquidacion.centroCostoId
        //centroCostoTrabajadoreId: liquidacion.centroCostoTrabajadoreId,
    };
    try {
        let filas = await logicaDB.editarLiquidacionDB(req.params.id, liquidacionData)
        return res.json({ filas })
    } catch (error) {
        return res.send('error')
    }
}

const cerrarLiquidacion = async(req,res) => {
    try {
        let filas = await logicaDB.cerrarLiquidacionDB(req.params.id)
        return res.json({ filas })
    } catch (error) {
        return res.send('error')
    }
}

const obtenerLiquidacionId = async (req, res) => {
    try {
        let centroTrabajador = await logicaDB.obtenerLiquidacionIdDB(req.params.id)
        return res.json({ centroTrabajador })
    } catch (error) {
        return res.send('error')
    }
}

const obtenerTodasLiquidaciones = async (req, res) => {
    try {
        let centroTrabajadores = await logicaDB.obtenerTodasLiquidacionesDB()
        return res.json({ centroTrabajadores })
    } catch (error) {
        return res.send('error')
    }
}

const buscarLiquidaciones = async (req, res) => {
    try {
        if (req.params.busca != null) {
            let centroTrabajadores = await logicaDB.buscarLiquidacionesDB(req.params.busca)
            res.json({ centroTrabajadores });
        } else {
            let centroTrabajadores = await logicaDB.obtenerTodasLiquidacionesDB()
            res.json({ centroTrabajadores });

        }

    } catch (error) {
        return res.send('error'+error)
    }
}

module.exports = {
    crearLiquidacion,
    editarLiquidacion,
    cerrarLiquidacion,
    obtenerLiquidacionId,
    obtenerTodasLiquidaciones,
    buscarLiquidaciones
}