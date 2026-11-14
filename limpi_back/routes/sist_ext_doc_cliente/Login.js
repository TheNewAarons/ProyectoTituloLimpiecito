const express = require('express')
const login = express.Router()

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob');

const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente')
const { registrarLogin } = require('../../services/auditoria/login');

const { expiraEn } = require('../../config/auth');

//INICIO DE SESION SISTEMA EXTERNO, USUARIO ASOCIADO A UN CLIENTE
login.post('/inicio_sesion',async (req,res)=>{
    const login = req.body
    const pass = atob(login.password)

    Acceso_cliente.findOne({
        where: {
            correo:login.correo
        }
    })
    .then(async (acceso)=>{
        if(acceso){
            if(bcrypt.compareSync(login.password,acceso.password)){
                delete acceso.dataValues.password
                let token = jwt.sign(acceso.dataValues, process.env.SECRET_KEY,{
                    expiresIn:expiraEn
                })
                await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: acceso.id, correo: login.correo, ok: true, ip: req.ip });
                return res.json({error:false,token,mensaje:'Acceso Correcto'})
            }else{
                await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: acceso.id, correo: login.correo, ok: false, motivo: 'PASSWORD_INCORRECTA', ip: req.ip });
                return res.json({error:true,mensaje:'Contraseña Incorrecta'})
            }
        }else{
            await registrarLogin({ contexto: 'acceso_clientes', entidad: 'acceso_clientes', usuarioId: null, correo: login.correo, ok: false, motivo: 'USUARIO_NO_EXISTE', ip: req.ip });
            return res.json({error:true,mensaje:'No Existe este Acceso Cliente'})
        }
    })
    .catch((error)=>{
        return res.status(500).json({error})
    })

})

module.exports = login;