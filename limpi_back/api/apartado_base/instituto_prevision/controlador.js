const logicaDB = require('./logica')

const crearInstitutoPrevision = async (req, res) => {
    const instituto_previsione = JSON.parse(req.body.instituto_previsione);
    const instituto_previsioneData = {
        nombre: instituto_previsione.nombre,
        comision: instituto_previsione.comision,
        estado: instituto_previsione.estado
    };
    try {
        let afp = await logicaDB.crearInstitutoPrevisionDB(instituto_previsioneData)
        return res.json({ afp })
    } catch (error) {
        return res.send('error:' + error)
    }
}

const editarInstitutoPrevision = async (req, res) => {
    const instituto_previsione = JSON.parse(req.body.instituto_previsione);
    const instituto_previsioneData = {
        nombre: instituto_previsione.nombre,
        comision: instituto_previsione.comision,
        estado: instituto_previsione.estado
    };
    try {
        let filas = await logicaDB.editarInstitutoPrevisionDB(req.params.id,instituto_previsioneData)
        return res.json({filas})
    } catch (error) {
        return res.send('error:' + error)
    }
}

const obtenerTodosInstitutoPrevision = async (req, res) => {
    try {
        let afps = await logicaDB.obtenerTodosInstitutoPrevisionDB()
        return res.json({afps})
    } catch (error) {
        return res.send('error:' + error)
    }
}

const obtenerInstitutoPrevisionActivos = async (req, res) => {
    try {
        let afps = await logicaDB.obtenerInstitutoPrevisionActivosDB()
        return res.json({afps})
    } catch (error) {
        return res.send('error:' + error)
    }
}
const obtenerInstitutoPrevisionInactivos = async (req, res) => {
    try {
        let afps = await logicaDB.obtenerInstitutoPrevisionInactivosDB()
        return res.json({afps})
    } catch (error) {
        return res.send('error:' + error)
    }
}
const desactivarInstitutoPrevisionDB = async (req, res) => {
    try {
        let filas = await logicaDB.activarInstitutoPrevisionDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error:' + error)
    }
}
const activarInstitutoPrevisionDB = async (req, res) => {
    try {
        let filas = await logicaDB.desactivarInstitutoPrevisionDB(req.params.id)
        return res.json({filas})
    } catch (error) {
        return res.send('error:' + error)
    }
}

module.exports = {
    crearInstitutoPrevision,
    editarInstitutoPrevision,
    obtenerTodosInstitutoPrevision,
    obtenerInstitutoPrevisionActivos,
    obtenerInstitutoPrevisionInactivos,
    desactivarInstitutoPrevisionDB,
    activarInstitutoPrevisionDB
}