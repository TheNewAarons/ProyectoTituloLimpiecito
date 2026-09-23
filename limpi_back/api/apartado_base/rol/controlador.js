const logicaDB = require('./logica')

const crearRol = async (req, res) => {
    const rol = JSON.parse(req.body.rol);

    const rolData = {
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        estado: rol.estado
    };
    try {
        let rol = await logicaDB.crearRolDB(rolData)
        return res.json({ rol })
    } catch (error) {
        return res.send('error' + error)
    }
}

const editarRol = async (req, res) => {
    const rol = JSON.parse(req.body.rol);
    const rolData = {
        nombre: rol.nombre,
        descripcion: rol.descripcion
    };
    try {
        let filas = await logicaDB.editarRolDB(req.params.id, rolData)
        return res.json({ filas })
    } catch (error) {
        return res.send('error' + error)
    }
}

const desactivarRol = async (req, res) => {
    try {
        let filas = await logicaDB.desactivarRolDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerRolesActivos = async (req, res) => {
    try {
        let roles = await logicaDB.obtenerRolesActivosDB()
        return res.json({roles})
    } catch (error) {
        return res.send('error' + error)
    }
}

const obtenerRolesInactivos = async (req, res) => {
    try {
        let roles = await logicaDB.obtenerRolesInactivosDB()
        return res.json({roles})
    } catch (error) {
        return res.send('error' + error)
    }
}


module.exports = {
    crearRol,
    editarRol,
    desactivarRol,
    obtenerRolesActivos,
    obtenerRolesInactivos
}