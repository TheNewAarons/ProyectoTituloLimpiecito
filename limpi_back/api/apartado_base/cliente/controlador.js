const logicaDB = require('./logica')

const crearCliente = async (req, res) => {
    const cliente = JSON.parse(req.body.cliente);
    const clienteData = {
        representante: cliente.representante,
        encargado_contrato: cliente.encargado_contrato,
        fecha_facturacion: new Date(cliente.fecha_facturacion),
        fecha_inicio_contrato: new Date(cliente.fecha_inicio_contrato),
        fecha_termino_contrato: new Date(cliente.fecha_termino_contrato),
        cant_trabajadores: cliente.cant_trabajadores,
        correo_encargado: cliente.correo_encargado,
        numero_contacto: cliente.numero_contacto,
        valor_factura: cliente.valor_factura,
        otra_informacion: cliente.otra_informacion,
        estado: cliente.estado
    };
    if (cliente.fecha_facturacion == null) {
        clienteData.fecha_facturacion = null;
    }
    if (cliente.fecha_inicio_contrato == null) {
        clienteData.fecha_inicio_contrato = null;
    }
    if (cliente.fecha_termino_contrato == null) {
        clienteData.fecha_termino_contrato = null;
    }
    try {
        let cliente = await logicaDB.crearClienteDB(clienteData)
        return res.json({ cliente })
    } catch (error) {
        return res.send('error' + error)
    }
}

const editarCliente = async (req, res) => {
    const cliente = JSON.parse(req.body.cliente);
    const clienteData = {
        representante: cliente.representante,
        encargado_contrato: cliente.encargado_contrato,
        fecha_facturacion: cliente.fecha_facturacion,
        fecha_inicio_contrato: cliente.fecha_inicio_contrato,
        fecha_termino_contrato: cliente.fecha_termino_contrato,
        cant_trabajadores: cliente.cant_trabajadores,
        correo_encargado: cliente.correo_encargado,
        numero_contacto: cliente.numero_contacto,
        valor_factura: cliente.valor_factura,
        otra_informacion: cliente.otra_informacion,
        estado: cliente.estado
    };
    if (cliente.fecha_facturacion == null) {
        clienteData.fecha_facturacion = null;
    }
    if (cliente.fecha_inicio_contrato == null) {
        clienteData.fecha_facturacion = null;
    }
    if (cliente.fecha_termino_contrato == null) {
        clienteData.fecha_termino_contrato = null;
    }
    try {
        let filas = await logicaDB.editarClienteDB(req.params.id, clienteData)
        return res.json({ filas })
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerClientesActivos = async (req, res) => {
    try {
        let clientes = await logicaDB.obtenerClientesActivosDB()
        return res.json({ clientes })
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerClientesInactivos = async (req, res) => {
    try {
        let clientes = await logicaDB.obtenerClientesInactivosDB()
        return res.json({ clientes })
    } catch (error) {
        return res.send('error' + error)
    }
}

const desactivarCliente = async (req, res) => {
    try {
        let filas = await logicaDB.desactivarClienteDB(req.params.id)
        return res.json({ filas })
    } catch (error) {
        return res.send('error' + error)
    }
}

const activarCliente = async (req, res) => {
    try {
        let filas = await logicaDB.activarClienteDB(req.params.id)
        return res.json({ filas })
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerClienteId = async (req, res) => {
    try {
        let cliente = await logicaDB.obtenerClienteIdDB(req.params.id)
        return res.json({ cliente })
    } catch (error) {
        return res.send('error' + error)
    }
}

const buscarClientesActivos = async (req, res) => {
    try {
        if (req.params.busca != null) {
            let clientes = await logicaDB.buscarClientesActivosDB(req.params.busca)
            return res.json({ clientes });

        } else {
            let clientes = await logicaDB.obtenerClientesActivosDB(req.params.busca)
            return res.json({ clientes });

        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const buscarClientesInactivos = async (req, res) => {
    try {
        if (req.params.busca != null) {
            let clientes = await logicaDB.buscarClientesInactivosDB(req.params.busca)
            return res.json({ clientes });

        } else {
            let clientes = await logicaDB.obtenerClientesInactivosDB(req.params.busca)
            return res.json({ clientes });

        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerClientesCarpeta = async(req,res) => {
    try{
        let clientes = await logicaDB.obtenerClientesCarpetaDB()
        return res.json({clientes})
    }catch(error){
        return res.send('error'+error)
    }
}

const buscarClientesCarpeta = async(req,res) => {
    try{
        if(req.params.busca != null){
            let clientes = await logicaDB.buscarClientesCarpetaDB(req.params.busca)
            return res.json({clientes})
        }else{
            let clientes = await logicaDB.obtenerClientesCarpetaDB()
            return res.json({clientes})
        }
    }catch(error){
        return res.send('error'+error)
    }
}

module.exports = {
    crearCliente,
    editarCliente,
    obtenerClientesActivos,
    obtenerClientesInactivos,
    desactivarCliente,
    activarCliente,
    obtenerClienteId,
    buscarClientesActivos,
    buscarClientesInactivos,
    obtenerClientesCarpeta,
    buscarClientesCarpeta
}