const logicaDB = require('./logica')

const crearProducto = async (req, res) => {
    const producto = JSON.parse(req.body.producto);
    const productoData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        tipo: producto.tipo,
        estado: producto.estado,
        stock: producto.stock,
        precio: producto.precio
    };
    try {
        let producto_existe = await logicaDB.buscarProductoNombreDB(productoData.nombre)
        if (producto_existe) {
            return res.json({ mensaje: 'Este nombre de producto ya esta registrado en el sistema!' });
        } else {
            let producto = await logicaDB.crearProductoDB(productoData)
            return res.json({ producto });
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const editarProducto = async (req, res) => {
    const producto = JSON.parse(req.body.producto);
    const productoData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        tipo: producto.tipo,
        estado: producto.estado,
        stock: producto.stock,
        precio: producto.precio
    };
    try {
        let producto_existe = await logicaDB.buscarProductoNombreDB(productoData.nombre)
        if (producto_existe && req.params.id != producto_existe.id) {
            return res.json({ mensaje: 'Este nombre de producto ya esta registrado en el sistema!' });
        } else {
            let filas = await logicaDB.editarProductoDB(req.params.id, productoData)
            return res.json({ filas });
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const desactivarProducto = async (req, res) => {
    try {
        let filas = await logicaDB.desactivarProductoDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error' + error)
    }
}

const activarProducto = async(req, res) => {
    try {
        let filas = await logicaDB.activarProductoDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error' + error)
    }
}

const borrarProducto = async(req, res) => {
    try {
        let filas = await logicaDB.borrarProductoDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerProductosActivos = async(req, res) => {
    try {
        let productos = await logicaDB.obtenerProductosActivosDB()
        return res.json({productos})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerProductosActivosConStock = async(req, res) => {
    try {
        let productos = await logicaDB.obtenerProductosActivosConStockDB()
        return res.json({productos})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerProductosInactivos = async(req, res) => {
    try {
        let productos = await logicaDB.obtenerProductosInactivosDB()
        return res.json({productosInactivos:productos})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerTodosProductos = async(req, res) => {
    try {
        let productos = await logicaDB.obtenerTodosProductos()
        return res.json({productos})
    } catch (error) {
        return res.send('error' + error)
    }
}

const buscarProductosActivos = async(req, res) => {
    try {
        if (req.params.busca != null) {
            let productos = await logicaDB.buscarProductosActivosDB(req.params.busca)
            return res.json({productos})
        }else{
            let productos = await logicaDB.obtenerProductosActivosDB()
            return res.json({productos})
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

const buscarProductosInactivos = async(req, res) => {
    try {
        if (req.params.busca != null) {
            let productos = await logicaDB.buscarProductosInactivosDB(req.params.busca)
            return res.json({productosInactivos:productos})
        }else{
            let productos = await logicaDB.obtenerProductosInactivosDB()
            return res.json({productosInactivos:productos})
        }
    } catch (error) {
        return res.send('error' + error)
    }
}

module.exports = {
    crearProducto,
    editarProducto,
    desactivarProducto,
    activarProducto,
    borrarProducto,
    obtenerProductosActivos,
    obtenerProductosActivosConStock,
    obtenerProductosInactivos,
    obtenerTodosProductos,
    buscarProductosActivos,
    buscarProductosInactivos
}