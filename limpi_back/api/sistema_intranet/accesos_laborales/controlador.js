const logicaDB = require('./logica')
const Schema = require('./schema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.SECRET_KEY = 'secret';

const crearAccesoLaboral = async(req,res) => {
    let acceso_laboral = req.body.acceso_laboral
    //acceso_laboral.password = atob(acceso_laboral.password)
    try {
        await Schema.accesoLaboralSchemaCrear.validateAsync(acceso_laboral);
    }
    catch (err) { 
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.crearAccesoLaboralDB(acceso_laboral)
        return res.status(200).json({
            'acceso_laboral':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const actualizarAccesoLaboral = async(req,res) => {
    let acceso_laboral = req.body.acceso_laboral
    let id = req.params.id
    try {
        await Schema.accesoLaboralSchemaActualizar.validateAsync(acceso_laboral);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.actualizarAccesoLaboralDB(id,acceso_laboral)
        return res.status(200).json({
            'acceso_laboral':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const obtenerAccesoLaboralPorIdTrabajador = async(req,res) => {
    let id_trabajador = req.params.id_trabajador
    try{
        let respuesta = await logicaDB.obtenerAccesoLaboralPorIdTrabajadorDB(id_trabajador)
        return res.status(200).json({
            'acceso_laboral':respuesta
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}
const cambiarEstadoAccesoLaboral = async(req,res) => {
    let id = req.params.id
    let acceso_laboral = req.body.acceso_laboral
    try {
        await Schema.accesoLaboralSchemaCambiarEstado.validateAsync(acceso_laboral);
    }
    catch (err) {
        res.status(400).json({'error':"error de validacion de campos. El campo: "+err.details[0].path});
        return;
    }
    try{
        let respuesta = await logicaDB.cambiarEstadoAccesoLaboralDB(id, acceso_laboral.estado)
        return res.status(200).json({
            'acceso_laboral':respuesta
        })
    }catch(error){
        return res.status(500).json({error})
    }
}
const login = async(req,res) => {
    let credenciales = req.body.credenciales
    try{
        let respuesta_trabajador;
        let respuesta = await logicaDB.loginDB(credenciales.correo);
        if(respuesta){
            console.log(credenciales)
            // let acceso = await bcrypt.compare(credenciales.password, respuesta.password)
            if(bcrypt.compareSync(credenciales.password, respuesta.password)){
                respuesta_trabajador = await logicaDB.obtenerTrabajadorPorIdDB(respuesta.trabajadoreId);
                if(respuesta_trabajador.estado == 1){
                    let datos_token = {
                        id:respuesta_trabajador.dataValues.id,
                        nombre:respuesta_trabajador.dataValues.nombre,
                        apellido:respuesta_trabajador.dataValues.apellido,
                        estado:respuesta_trabajador.dataValues.estado,
                        rut:respuesta_trabajador.dataValues.rut,
                        tipo_acceso:respuesta.tipo,
                        n_empleado:respuesta_trabajador.dataValues.n_empleado
                    }
                    let token = jwt.sign(datos_token, process.env.SECRET_KEY,{
                        expiresIn:'1d'
                    })
                    let mensaje = "Bienvenido "+respuesta_trabajador.nombre+respuesta_trabajador.apellido
                    return res.status(200).json({
                        'acceso_laboral':respuesta,
                        'token': token,
                        mensaje,
                        'estado': true
                    })
                }else{
                    return res.status(200).json({
                        'acceso_laboral':respuesta,
                        'mensaje': 'Trabajador No adminito',
                        'estado': false
                    })
                }
            }else{
                return res.status(200).json({
                    'acceso_laboral':respuesta,
                    'mensaje': 'Contraseña invalida o usuario bloqueado',
                    'estado': false
                })
            }

        }else{
            return res.status(200).json({
                //'acceso_laboral':respuesta,
                'mensaje': 'Credenciales invalidas',
                'estado': false
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

const existeAccesoLaboral = async(req,res) => {
    let id_trabajador = req.params.id_trabajador
    try{
        let respuesta = await logicaDB.existeAccesoLaboralDB(id_trabajador)
        if(respuesta){
            return res.status(200).json({
                'acceso_laboral':respuesta,
                'estado':true
            })
        }else{
            return res.status(200).json({
                'acceso_laboral':respuesta,
                'estado':false
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({error})
    }
}

module.exports = {
    crearAccesoLaboral,
    actualizarAccesoLaboral,
    obtenerAccesoLaboralPorIdTrabajador,
    cambiarEstadoAccesoLaboral,
    login,
    existeAccesoLaboral
}