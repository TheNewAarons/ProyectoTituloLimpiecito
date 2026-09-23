const logicaDB = require('./logica')

const crearTrabajador = async(req,res) => {
    const trabajadore = JSON.parse(req.body.trabajadore);
    const trabajadoreData = {
        nombre: trabajadore.nombre,
        apellido: trabajadore.apellido,
        rut: trabajadore.rut,
        telefono: trabajadore.telefono,
        telefono_emergencia: trabajadore.telefono_emergencia,
        correo: trabajadore.correo,
        direccion: trabajadore.direccion,
        fecha_nacimiento: new Date(trabajadore.fecha_nacimiento),
        sexo: trabajadore.sexo,
        estado: trabajadore.estado,
        n_empleado: trabajadore.n_empleado,
        fecha_inicio_contrato: new Date(trabajadore.fecha_inicio_contrato),
        fecha_termino_contrato: new Date(trabajadore.fecha_termino_contrato),
        carga_familiar: trabajadore.carga_familiar,
        enfermedad_cronica: trabajadore.enfermedad_cronica,
        saludeId: trabajadore.saludeId,
        seguroId: trabajadore.seguroId,
        institutoPrevisioneId: trabajadore.institutoPrevisioneId,
        datoLiquidacioneId: trabajadore.datoLiquidacioneId
    };
    const dato_liquidacione = JSON.parse(req.body.dato_liquidacione);
    const dato_liquidacioneData = {
        sueldo_base: dato_liquidacione.sueldo_base,
        gratificacion: dato_liquidacione.gratificacion,
        responsabilidad: dato_liquidacione.responsabilidad,
        colacion: dato_liquidacione.colacion,
        movilizacion: dato_liquidacione.movilizacion,
        alimentacion: dato_liquidacione.alimentacion,
        cant_familia: dato_liquidacione.cant_familia,
        valor_carga_familia: dato_liquidacione.valor_carga_familia
    };
    if (trabajadore.fecha_nacimiento == null) {
        trabajadoreData.fecha_nacimiento = null;
    }
    if (trabajadore.fecha_inicio_contrato == null) {
        trabajadoreData.fecha_inicio_contrato = null;
    }
    if (trabajadore.fecha_termino_contrato == null) {
        trabajadoreData.fecha_termino_contrato = null;
    }
    try{
        let max = await logicaDB.buscarNumeroEmpladoTrabajadorDB()
        if (!max) {
            trabajadoreData.n_empleado = 1;
        } else {
            trabajadoreData.n_empleado = max + 1;
        }
        let dato = await logicaDB.crearDatoLiquidacioneDB(dato_liquidacioneData)
        trabajadoreData.datoLiquidacioneId = dato.id
        let trabajadore = await logicaDB.crearTrabajadorDB(trabajadoreData)
        return res.json({trabajadore})
    }catch(error){
        console.log('error crear trabajador',error)
        return res.send('error'+error)
    }
}

const editarTrabajador = async(req,res) => {
    const trabajadore = JSON.parse(req.body.trabajadore);
    const trabajadoreData = {
        nombre: trabajadore.nombre,
        apellido: trabajadore.apellido,
        rut: trabajadore.rut,
        telefono: trabajadore.telefono,
        telefono_emergencia: trabajadore.telefono_emergencia,
        correo: trabajadore.correo,
        direccion: trabajadore.direccion,
        fecha_nacimiento: trabajadore.fecha_nacimiento,
        sexo: trabajadore.sexo,
        estado: trabajadore.estado,
        n_empleado: trabajadore.n_empleado,
        fecha_inicio_contrato: new Date(trabajadore.fecha_inicio_contrato),
        fecha_termino_contrato: new Date(trabajadore.fecha_termino_contrato),
        carga_familiar: trabajadore.carga_familiar,
        enfermedad_cronica: trabajadore.enfermedad_cronica,
        saludeId: trabajadore.saludeId,
        seguroId: trabajadore.seguroId,
        institutoPrevisioneId: trabajadore.institutoPrevisioneId
    };
    const dato_liquidacioneData = trabajadore.dato_liquidacione;
    if (trabajadore.fecha_nacimiento == null) {
        trabajadoreData.fecha_nacimiento = null;
    }
    if (trabajadore.fecha_inicio_contrato == null) {
        trabajadoreData.fecha_inicio_contrato = null;
    }
    if (trabajadore.fecha_termino_contrato == null) {
        trabajadoreData.fecha_termino_contrato = null;
    }
    try{
        let trabajador_buscado = await logicaDB.buscarTrabajadorIdDB(req.params.id)
        let filas = await logicaDB.editarTrabajadorDB(req.params.id,trabajadoreData)
        let filas_2 = await logicaDB.editarDatoLiquidacionDB(trabajador_buscado.datoLiquidacioneId,dato_liquidacioneData)
        const total_filas = Number(filas) + Number(filas_2);
        return res.json({ filas: total_filas });
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerTodosTrabajadores = async(req,res) => {
    try{
        let trabajadores = await logicaDB.obtenerTodosTrabajadoresDB()
        return res.json({trabajadores})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerTrabajadoresActivos = async(req,res) => {
    try{
        let trabajadores = await logicaDB.obtenerTrabajadoresActivosDB()
        return res.json({trabajadores})
    }catch(error){
        return res.send('error'+error)
    }
}

const  obtenerTrabajadoresInactivos = async(req,res) => {
    try{
        let trabajadores = await logicaDB.obtenerTrabajadoresInactivosDB()
        return res.json({trabajadores})
    }catch(error){
        return res.send('error'+error)
    }
}

const desactivarTrabajador = async(req,res) => {
    try{
        let filas = await logicaDB.desactivarTrabajadorDB(req.params.id)
        return res.json({filas})
    }catch(error){
        return res.send('error'+error)
    }
}

const activarTrabajador = async(req,res) => {
    try{
        let filas = await logicaDB.activarTrabajadorDB(req.params.id)
        return res.json({filas})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerTrabajadorId = async(req,res) => {
    try{
        let trabajador = await logicaDB.obtenerTrabajadorIdDB(req.params.id)
        return res.json({trabajador})
    }catch(error){
        return res.send('error'+error)
    }
}

const buscarTrabajadoresActivosDB = async(req,res) => {
    try{
        if (req.params.busca != null) {
            let trabajadores = await logicaDB.buscarTrabajadoresActivosDB(req.params.busca)
            return res.json({trabajadores})
        }else{
            let trabajadores = await logicaDB.obtenerTrabajadoresActivosDB()
            return res.json({trabajadores})
        }
    }catch(error){
        return res.send('error'+error)
    }
}

const buscarTrabajadoresInactivosDB = async(req,res) => {
    try{
        if (req.params.busca != null) {
            let trabajadores = await logicaDB.buscarTrabajadoresInactivosDB(req.params.busca)
            return res.json({trabajadores})
        }else{
            let trabajadores = await logicaDB.obtenerTrabajadoresInactivosDB()
            return res.json({trabajadores})
        }
    }catch(error){
        return res.send('error'+error)
    }
}

module.exports = {
    crearTrabajador,
    editarTrabajador,
    obtenerTodosTrabajadores,
    obtenerTrabajadoresActivos,
    obtenerTrabajadoresInactivos,
    desactivarTrabajador,
    activarTrabajador,
    obtenerTrabajadorId,
    buscarTrabajadoresActivosDB,
    buscarTrabajadoresInactivosDB
}